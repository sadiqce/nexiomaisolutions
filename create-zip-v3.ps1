Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = 'backend-deploy-https.zip'

# Remove old zip
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

# Create new archive
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

# Add individual files
$filesToAdd = @{
    'backend-deploy/server.js' = 'server.js'
    'backend-deploy/package.json' = 'package.json'
    'backend-deploy/Procfile' = 'Procfile'
}

foreach ($source in $filesToAdd.Keys) {
    $entry = $zip.CreateEntry($filesToAdd[$source])
    $stream = $entry.Open()
    $bytes = [System.IO.File]::ReadAllBytes($source)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Dispose()
    Write-Host "[OK] Added $($filesToAdd[$source])"
}

# Add .ebextensions files with FORWARD SLASHES only
$ebExtPath = 'backend-deploy/.ebextensions'
Get-ChildItem $ebExtPath -File | ForEach-Object {
    # Use forward slash explicitly
    $entryPath = ".ebextensions/$($_.Name)"
    $entry = $zip.CreateEntry($entryPath, 'Optimal')
    $stream = $entry.Open()
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.Dispose()
    Write-Host "[OK] Added $entryPath"
}

$zip.Dispose()

Write-Host "[OK] Zip created successfully"

# Verify no backslashes
$zip2 = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
Write-Host ""
Write-Host "Verification - Zip entries:"
foreach ($entry in $zip2.Entries) {
    $hasBackslash = $entry.FullName.Contains([char]92)
    $backslashStr = if ($hasBackslash) { " [BACKSLASH!]" } else { " [OK]" }
    Write-Host "  $($entry.FullName)$backslashStr"
}
$zip2.Dispose()

Write-Host ""
Write-Host "Size: $((Get-Item $zipPath).Length) bytes"
