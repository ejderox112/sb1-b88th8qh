param(
    [string[]] $MvnArgs
)

function Invoke-Maven($args) {
    $mvnCmd = Get-Command mvn -ErrorAction SilentlyContinue
    if ($mvnCmd) {
        Write-Host "Found system 'mvn' -> using it"
        & mvn @args
        return $LASTEXITCODE
    }

    $mavenDir = Join-Path $PSScriptRoot "..\.maven\apache-maven-3.9.12"
    $mavenBin = Join-Path $mavenDir "bin\mvn.cmd"

    if (-Not (Test-Path $mavenBin)) {
        Write-Host "Maven not found on system; downloading portable Maven..."
        $zipUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.12/binaries/apache-maven-3.9.12-bin.zip"
        $zipPath = Join-Path $PSScriptRoot "..\.maven\apache-maven-3.9.12.zip"
        New-Item -ItemType Directory -Force -Path (Split-Path $zipPath) | Out-Null
        Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
        Write-Host "Extracting Maven..."
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, Join-Path $PSScriptRoot "..\.maven")
        Remove-Item $zipPath -Force
    }

    if (-Not (Test-Path $mavenBin)) {
        Write-Error "Failed to provision Maven"
        exit 1
    }

    Write-Host "Running bundled Maven: $mavenBin"
    & $mavenBin @args
    return $LASTEXITCODE
}

# Pass-through args
if ($MvnArgs -eq $null -or $MvnArgs.Count -eq 0) {
    $MvnArgs = @()
}

exit (Invoke-Maven $MvnArgs)
