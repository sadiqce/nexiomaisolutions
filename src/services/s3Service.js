import { S3_CONFIG } from '../config/aws';

import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const getDownloadUrl = async (fileKey) => {
    try {
        // Debug logging
        console.log(`[S3] Attempting to get download URL for key: ${fileKey}`);
        console.log(`[S3] Key length: ${fileKey.length}`);
        
        // Check for potential whitespace issues
        const trimmedKey = fileKey.trim();
        if (trimmedKey !== fileKey) {
            console.warn(`[S3] WARNING: Key has leading/trailing whitespace. Original length: ${fileKey.length}, Trimmed length: ${trimmedKey.length}`);
        }

        const command = new GetObjectCommand({
            Bucket: S3_CONFIG.bucketName,
            Key: fileKey,
        });

        try {
            // Try to generate signed URL
            const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            console.log(`[S3] Successfully generated signed URL for: ${fileKey}`);
            return { success: true, url: signedUrl };
        } catch (error) {
            // File doesn't exist at this path - log detailed info for debugging
            console.error(`[S3] File not found at path: ${fileKey}`);
            console.error(`[S3] Error code:`, error.Code || error.$metadata?.httpStatusCode);
            console.error(`[S3] Error message:`, error.message);
            
            // Provide helpful error message with debugging info
            return { 
                success: false, 
                error: `File not found in S3. This may be a character encoding issue with special characters in the filename.`,
                details: {
                    requestedKey: fileKey,
                    keyLength: fileKey.length,
                    bucket: S3_CONFIG.bucketName,
                    errorCode: error.Code || 'NoSuchKey',
                    suggestion: 'The filename contains spaces or special characters. Check the Airtable DownloadLink field for any hidden characters.'
                }
            };
        }
    } catch (error) {
        console.error(`[S3] Unexpected error getting download URL for ${fileKey}:`, error);
        return { 
            success: false, 
            error: error.message,
            details: {
                requestedKey: fileKey,
                bucket: S3_CONFIG.bucketName
            }
        };
    }
};

const s3Client = new S3Client({
    region: S3_CONFIG.region,
    credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
    },
});

export const uploadFileToS3 = async (file, currentUser) => {
    console.log(`[S3 UPLOAD] Starting upload for: ${file.name}`);
    
    if (!currentUser) {
        throw new Error('CurrentUser is required for S3 upload');
    }

    try {
        // Use username as folder prefix
        const username = currentUser.uid || currentUser.displayName || currentUser.email?.split('@')[0] || 'user';
        const fileKey = `clients/${username}/${file.name}`;
        
        const command = new PutObjectCommand({
            Bucket: S3_CONFIG.bucketName,
            Key: fileKey,
            ContentType: file.type,
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

        const response = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        console.log(`[S3] Successfully uploaded ${file.name} to ${S3_CONFIG.bucketName}/${fileKey}`);
        return {
            success: true,
            url: `https://${S3_CONFIG.bucketName}.s3.${S3_CONFIG.region}.amazonaws.com/${fileKey}`,
        };
    } catch (error) {
        console.error(`[S3] Failed to upload ${file.name}:`, error);
        return { success: false, error: error.message };
    }
};

// DEBUG FUNCTION: List objects in S3 with a given prefix
export const debugListS3Objects = async (prefix = 'clients/') => {
    try {
        const command = new ListObjectsV2Command({
            Bucket: S3_CONFIG.bucketName,
            Prefix: prefix,
            MaxKeys: 100,
        });

        const response = await s3Client.send(command);
        
        console.log(`[S3 DEBUG] Found ${response.Contents?.length || 0} objects with prefix "${prefix}":`);
        
        if (response.Contents) {
            response.Contents.forEach(obj => {
                console.log(`  - ${obj.Key}`);
                console.log(`    Size: ${obj.Size} bytes, LastModified: ${obj.LastModified}`);
            });
            return response.Contents;
        } else {
            console.log('[S3 DEBUG] No objects found with that prefix');
            return [];
        }
    } catch (error) {
        console.error(`[S3 DEBUG] Failed to list objects:`, error);
        return null;
    }
};
