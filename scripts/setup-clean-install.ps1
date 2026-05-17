# Clean local install: removes build caches and dependencies, then reinstalls from package-lock (if present).
# Run from PowerShell:  .\scripts\setup-clean-install.ps1
# After install, use `npm run dev` or `npm run build`.
#
# Browser-stored data (localStorage / IndexedDB for this site's origin) is NOT touched here.
# To start with no saved site data, clear storage for this app in your browser (Application > Storage).

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host 'Removing node_modules, dist, .quasar ...'
Remove-Item -Recurse -Force node_modules, dist, .quasar -ErrorAction SilentlyContinue

Write-Host 'Installing dependencies...'
if (Test-Path package-lock.json) {
  npm ci
} else {
  npm install
}

Write-Host 'Done.'
