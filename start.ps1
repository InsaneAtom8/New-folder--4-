$ErrorActionPreference = 'Stop'

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendProcess = $null

try {
    Set-Location $rootDir

    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw 'npm is required to run the frontend.'
    }

    $pythonCommand = Get-Command py.exe -ErrorAction SilentlyContinue
    if (-not $pythonCommand) {
        $pythonCommand = Get-Command python.exe -ErrorAction SilentlyContinue
    }
    if (-not $pythonCommand) {
        throw 'Python is required to run the detector backend.'
    }

    if (-not (Test-Path (Join-Path $rootDir 'node_modules'))) {
        Write-Host 'Installing frontend dependencies...'
        & npm.cmd install
    }

    Write-Host 'Starting local YOLO detector on http://localhost:8000...'
    $pythonArguments = @('-m', 'uvicorn', 'server:app', '--host', '0.0.0.0', '--port', '8000')
    $backendProcess = Start-Process `
        -FilePath $pythonCommand.Source `
        -ArgumentList $pythonArguments `
        -WorkingDirectory $rootDir `
        -PassThru

    Write-Host 'Starting frontend on http://localhost:3000...'
    & npm.cmd run dev -- --host 0.0.0.0
}
finally {
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Host 'Stopping local YOLO detector...'
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}