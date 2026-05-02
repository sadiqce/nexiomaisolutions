// S3 File Service - Routes through Backend
// DO NOT call AWS S3 directly from frontend - all requests go through backend
// Backend handles credentials securely on server-side

import { getBackendUrl } from './apiClient.js';

const BACKEND_URL = getBackendUrl();

/**
 * Get a signed URL for downloading a file from S3
 * @param {string} fileKey - S3 file key (e.g., 'clients/user/file.pdf')
 * @returns {Promise<object>} { success, url } or { success: false, error }
 */
export const getDownloadUrl = async (fileKey) => {
    try {
        console.log(`[S3] Attempting to get download URL for key: ${fileKey}`);
        
        const response = await fetch(
            `${BACKEND_URL}/api/file/download-url/${encodeURIComponent(fileKey)}`,
            { headers: { 'Content-Type': 'application/json' } }
        );
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error(`[S3] Failed to get download URL:`, data.error);
            return {
                success: false,
                error: data.error || 'Failed to get download URL'
            };
        }
        
        console.log(`[S3] Successfully generated signed URL for: ${fileKey}`);
        return { success: true, url: data.url };
    } catch (error) {
        console.error(`[S3] Unexpected error getting download URL:`, error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get a signed URL for uploading a file to S3
 * @param {string} userId - User ID (Firebase UID)
 * @param {string} fileName - File name for S3 key
 * @returns {Promise<object>} { uploadUrl, fileKey } or throws error
 */
export const getUploadUrl = async (userId, fileName) => {
    try {
        console.log(`[S3] Requesting upload URL for: ${fileName}`);
        
        const response = await fetch(`${BACKEND_URL}/api/file/upload-url`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, fileName })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(`Failed to get upload URL: ${data.error}`);
        }
        
        console.log(`[S3] Got upload URL for: ${data.fileKey}`);
        return data;
    } catch (error) {
        console.error(`[S3] Failed to get upload URL:`, error);
        throw error;
    }
};

/**
 * Upload a file to S3 using pre-signed URL
 * @param {File} file - File object to upload
 * @param {string} uploadUrl - Pre-signed URL from getUploadUrl
 * @returns {Promise<object>} { success, url } or { success: false, error }
 */
export const uploadFileToS3 = async (file, uploadUrl, fileKey) => {
    console.log(`[S3] Starting upload for: ${file.name}`);
    
    try {
        const response = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        console.log(`[S3] Successfully uploaded ${file.name}`);
        return {
            success: true,
            fileKey: fileKey,
            fileName: file.name
        };
    } catch (error) {
        console.error(`[S3] Failed to upload ${file.name}:`, error);
        return { success: false, error: error.message };
    }
};

// DEBUG FUNCTION: List objects in S3 (call backend for this)
export const debugListS3Objects = async (prefix = 'clients/') => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/file/list`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prefix })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            console.error('[S3 DEBUG] Failed to list objects:', data.error);
            return null;
        }
        
        console.log(`[S3 DEBUG] Found ${data.contents?.length || 0} objects with prefix "${prefix}"`);
        return data.contents || [];
    } catch (error) {
        console.error(`[S3 DEBUG] Failed to list objects:`, error);
        return null;
    }
};
