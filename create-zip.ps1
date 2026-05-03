Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = 'backend-deploy-https.zip'
$stagePath = 'backend-deploy-staging'

# Clean up
if (Test-Path $stagePath) { Remove-Item $stagePath -Recurse -Force }
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Create staging directory
New-Item -ItemType Directory $stagePath | Out-Null

# Copy files to staging
Copy-Item 'backend-deploy/server.js' "$stagePath/"
Copy-Item 'backend-deploy/package.json' "$stagePath/"
Copy-Item 'backend-deploy/Procfile' "$stagePath/"
Copy-Item 'backend-deploy/.ebextensions' "$stagePath/.ebextensions" -Recurse

# Create zip from staging (stores with forward slashes)
[System.IO.Compression.ZipFile]::CreateFromDirectory($stagePath, $zipPath, 'Optimal', $false)

# Cleanup staging
Remove-Item $stagePath -Recurse -Force

Write-Host '[OK] Created zip with proper Unix paths'
Write-Host ('Size: ' + ((Get-Item $zipPath).Length) + ' bytes')
