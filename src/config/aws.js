export const S3_CONFIG = {
    bucketName: 'YOUR_S3_BUCKET_NAME_HERE', 
    region: 'us-east-1', 
    // In production, use import.meta.env.VITE_...
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || 'MOCK_ACCESS_KEY',
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || 'MOCK_SECRET_KEY',
};

// This definition must have the 'export' keyword to be accessible in other files.
export const MOCK_AUTH = {
    EMAIL: 'test@nexiom.com',
    PASSWORD: 'password123',
    TARGET_EMAIL: 'sadiqce85@gmail.com'
};