# Run this script from an elevated PowerShell (Run as Administrator).
# Installs Temurin JDK 21 and Apache Maven via Chocolatey, then verifies installation.

if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
  Write-Error "This script must be run as Administrator. Right-click PowerShell and select 'Run as Administrator'."
  exit 1
}

Write-Output "Checking Chocolatey..."
if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
  Write-Output "Chocolatey not found. Installing Chocolatey..."
  Set-ExecutionPolicy Bypass -Scope Process -Force
  iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
}

Write-Output "Installing Temurin JDK 21 and Maven via Chocolatey..."
choco install temurin21 -y --no-progress
choco install maven -y --no-progress

Write-Output "Setting JAVA_HOME (session only)..."
# Try to find java installation path
$javaCmd = Get-Command java -ErrorAction SilentlyContinue
if ($null -ne $javaCmd) {
  $javaPath = Split-Path $javaCmd.Source -Parent
  if ($javaPath -match "\\bin$") { $javaHome = Split-Path $javaPath -Parent } else { $javaHome = $javaPath }
  $env:JAVA_HOME = $javaHome
  Write-Output "JAVA_HOME set to: $env:JAVA_HOME"
} else {
  Write-Warning "java executable not found on PATH after install. You may need to restart your shell or log off to apply environment variable changes."
}

Write-Output "--- Verification ---"
Write-Output "java -version:"; java -version 2>&1
Write-Output ""; Write-Output "mvn -v:";
if (Get-Command mvn -ErrorAction SilentlyContinue) { mvn -v } else { Write-Output "mvn not found" }

Write-Output "Done. If you see correct java and mvn versions, return here and I'll run the project build."