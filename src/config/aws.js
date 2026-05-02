// AWS Configuration - DEPRECATED
// AWS credentials have been moved to backend for security
// All S3 operations now go through backend endpoints

// This file is kept for reference only - DO NOT USE IN FRONTEND
// Frontend now calls backend endpoints instead:
// - POST /api/file/upload-url - Get signed URL for S3 upload
// - GET /api/file/download-url/:fileKey - Get signed URL for S3 download
// - Backend handles AWS credentials securely

console.warn('[AWS Config] This frontend config is deprecated. Use backend API endpoints instead.');

// Deprecated - DO NOT USE
export const S3_CONFIG = {
    bucketName: 'certificate-bot-vault-v1', 
    region: 'us-east-2', 
    accessKeyId: undefined, // REMOVED - not in frontend
    secretAccessKey: undefined, // REMOVED - not in frontend
};
