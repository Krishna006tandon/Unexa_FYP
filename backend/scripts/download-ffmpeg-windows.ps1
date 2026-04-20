$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$dest = Join-Path $root "tmp\ffmpeg"
New-Item -ItemType Directory -Force -Path $dest | Out-Null

$zip = Join-Path $dest "ffmpeg-release-essentials.zip"
$url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

Write-Host "Downloading FFmpeg..." $url
Invoke-WebRequest -Uri $url -OutFile $zip

Write-Host "Extracting..." $zip
Expand-Archive -LiteralPath $zip -DestinationPath $dest -Force

$ff = Get-ChildItem -Path $dest -Recurse -Filter ffmpeg.exe | Select-Object -First 1
if (-not $ff) { throw "ffmpeg.exe not found after extraction" }

Write-Host ""
Write-Host "FFmpeg installed at:"
Write-Host $ff.FullName
Write-Host ""
Write-Host "Set this for your shell (PowerShell):"
Write-Host "`$env:FFMPEG_PATH=`"$($ff.FullName)`""
Write-Host ""
Write-Host "Then run:"
Write-Host "  cd backend; npm run streaming"

