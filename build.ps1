$ErrorActionPreference = 'Stop'

$projectRoot = $PSScriptRoot
$buildDirectory = Join-Path $projectRoot 'build'
$distDirectory = Join-Path $projectRoot 'dist'
$releaseDirectory = Join-Path $projectRoot 'release'
$pythonCacheDirectory = Join-Path $projectRoot '__pycache__'
$appName = -join @(
    [char]0x732A, [char]0x732A, [char]0x6210, [char]0x7EE9,
    [char]0x67E5, [char]0x8BE2
)

foreach ($path in @($buildDirectory, $distDirectory, $releaseDirectory)) {
    if (Test-Path -LiteralPath $path) {
        Remove-Item -LiteralPath $path -Recurse -Force
    }
}

Get-ChildItem -LiteralPath $projectRoot -Filter '*.spec' -File |
    Remove-Item -Force

python -m PyInstaller `
  --noconfirm `
  --clean `
  --onefile `
  --windowed `
  --name $appName `
  --icon 'assets\app-icon.ico' `
  --add-data 'assets;assets' `
  --collect-all webview `
  --collect-all pythonnet `
  --collect-all clr_loader `
  --collect-all bottle `
  --collect-all proxy_tools `
  --collect-all cffi `
  grade_viewer.py

$executable = Join-Path $distDirectory ($appName + '.exe')
if (-not (Test-Path -LiteralPath $executable)) {
    throw ('Executable was not generated: ' + $executable)
}

New-Item -ItemType Directory -Path $releaseDirectory | Out-Null
$releaseNotes = Join-Path $releaseDirectory '使用说明.txt'
$notes = @(
    'Piggy Grade Viewer'
    ''
    ('Double-click "' + $appName + '.exe" to run. Python and requirements.txt are not required.')
    'Windows 10/11 x64 is supported.'
    'If Microsoft Edge WebView2 Runtime is missing, the app can install it from Microsoft.'
)
$notes | Set-Content -LiteralPath $releaseNotes -Encoding UTF8

$releaseExecutable = Join-Path $releaseDirectory ($appName + '.exe')
Copy-Item -LiteralPath $executable -Destination $releaseExecutable
$releaseArchive = Join-Path $distDirectory 'FJNU-Grade-Viewer-Windows-x64.zip'
Compress-Archive -LiteralPath $releaseExecutable, $releaseNotes -DestinationPath $releaseArchive

Get-ChildItem -LiteralPath $projectRoot -Filter '*.spec' -File |
    Remove-Item -Force

if (Test-Path -LiteralPath $buildDirectory) {
    Remove-Item -LiteralPath $buildDirectory -Recurse -Force
}

if (Test-Path -LiteralPath $pythonCacheDirectory) {
    Remove-Item -LiteralPath $pythonCacheDirectory -Recurse -Force
}

Remove-Item -LiteralPath $releaseDirectory -Recurse -Force

Write-Host ('Build complete: ' + $executable)
Write-Host ('Release archive: ' + $releaseArchive)
