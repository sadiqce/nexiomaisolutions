#!/bin/bash
# Create a tar.gz for AWS Beanstalk (more Linux-friendly than Windows zip)

cd /tmp
rm -rf nexiom-deploy 2>/dev/null
mkdir -p nexiom-deploy

# Copy files from the Windows directory
cp /mnt/c/Users/Sadiq/Documents/projects/nexiom-ai/backend-deploy/server.js nexiom-deploy/
cp /mnt/c/Users/Sadiq/Documents/projects/nexiom-ai/backend-deploy/package.json nexiom-deploy/
cp /mnt/c/Users/Sadiq/Documents/projects/nexiom-ai/backend-deploy/Procfile nexiom-deploy/
cp -r /mnt/c/Users/Sadiq/Documents/projects/nexiom-ai/backend-deploy/.ebextensions nexiom-deploy/

# Create tar.gz
cd /tmp/nexiom-deploy
tar -czf /mnt/c/Users/Sadiq/Documents/projects/nexiom-ai/backend-deploy-https.tar.gz *

# Show result
ls -lh /mnt/c/Users/Sadiq/Documents/projects/nexiom-ai/backend-deploy-https.tar.gz
echo "Created tar.gz successfully"
