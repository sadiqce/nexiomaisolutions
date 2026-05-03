Add-Type -AssemblyName System.IO.Compression

$zipPath = 'backend-deploy-https.zip'

# Remove old zip
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Create zip and add files directly to root
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

# Add files to root of zip (not in subdirectories)
$files = @(
    'backend-deploy/server.js',
    'backend-deploy/package.json',
    'backend-deploy/Procfile'
)

foreach ($file in $files) {
    $filename = Split-Path $file -Leaf
    $entry = $zip.CreateEntry($filename)
    $stream = $entry.Open()
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    Write-Host "[OK] Added $filename"
}

# Add .ebextensions files
$ebExtPath = 'backend-deploy/.ebextensions'
Get-ChildItem $ebExtPath -File | ForEach-Object {
    $filename = $_.Name
    $entry = $zip.CreateEntry(".ebextensions/$filename")
    $stream = $entry.Open()
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Close()
    Write-Host "[OK] Added .ebextensions/$filename"
}

$zip.Close()

Write-Host "[OK] Zip created successfully"
Write-Host ("Size: " + ((Get-Item $zipPath).Length) + " bytes")

# Verify contents
Write-Host "`nZip contents:"
$zip2 = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
$zip2.Entries | ForEach-Object { Write-Host "  - " + $_.FullName }
$zip2.Close()
