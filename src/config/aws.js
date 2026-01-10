export const S3_CONFIG = {
    bucketName: 'YOUR_S3_BUCKET_NAME_HERE', 
    region: 'us-east-1', 
    // In production, use process.env.REACT_APP_...
    accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || 'MOCK_ACCESS_KEY',
    secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || 'MOCK_SECRET_KEY',
};

// This definition must have the 'export' keyword to be accessible in other files.
export const MOCK_AUTH = {
    EMAIL: 'test@nexiom.com',
    PASSWORD: 'password123',
    TARGET_EMAIL: 'sadiqce85@gmail.com'
};