export const S3_CONFIG = {
    bucketName: 'certificate-bot-vault-v1', 
    region: 'us-east-2', 
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
};
