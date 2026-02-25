# Create a clean zip of the project for sharing (no .git, .cursor, node_modules, etc.)
# Run from project root: powershell -ExecutionPolicy Bypass -File scripts/create-zip.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot + "\.."
$zipName = "canine-iq-main.zip"
$zipPath = (Join-Path (Split-Path $root -Parent) $zipName)
$tempDir = Join-Path $env:TEMP "canine-iq-zip-$(Get-Random)"

$excludeDirs = @(".git", ".cursor", "node_modules", ".expo", "dist", "web-build")
$excludePatterns = @("*.log", "*.tsbuildinfo", ".env", ".env.*", "*.pem", "*.key", "*.jks", "*.p8", "*.p12", "*.mobileprovision")

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
$dest = Join-Path $tempDir "canine-iq-main"
New-Item -ItemType Directory -Path $dest -Force | Out-Null

Get-ChildItem -Path $root -Force | ForEach-Object {
    $name = $_.Name
    if ($excludeDirs -contains $name) { return }
    Copy-Item -Path $_.FullName -Destination (Join-Path $dest $name) -Recurse -Force -ErrorAction SilentlyContinue
}

# Remove excluded dirs that might have been copied (e.g. nested)
$excludeDirs | ForEach-Object {
    $d = Join-Path $dest $_
    if (Test-Path $d) { Remove-Item $d -Recurse -Force }
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path $dest -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item $tempDir -Recurse -Force

Write-Host "Created: $zipPath"
