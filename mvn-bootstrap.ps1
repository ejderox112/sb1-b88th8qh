param()

if (!(Test-Path -Path "$PSScriptRoot\.maven")) {
    Write-Output "Creating .maven directory..."
    New-Item -ItemType Directory -Path "$PSScriptRoot\.maven" | Out-Null
}

$mavenDir = Join-Path $PSScriptRoot ".maven\apache-maven-3.9.12"
if (!(Test-Path -Path $mavenDir)) {
    Write-Output "Downloading Maven..."
    $url = 'https://archive.apache.org/dist/maven/maven-3/3.9.12/binaries/apache-maven-3.9.12-bin.zip'
    $zip = Join-Path $env:TEMP 'maven.zip'
    Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
    Write-Output "Extracting Maven..."
    Expand-Archive -LiteralPath $zip -DestinationPath (Join-Path $PSScriptRoot '.maven') -Force
    Remove-Item $zip
}

Write-Output "Maven bootstrap complete. Add $PSScriptRoot\.maven\apache-maven-3.9.12\bin to your PATH or use it directly."
