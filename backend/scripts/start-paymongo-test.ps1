$ErrorActionPreference = 'Stop'
$backendDirectory = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $backendDirectory
$runtimeDirectory = [System.IO.Path]::GetFullPath((Join-Path $backendDirectory '.local/paymongo'))
$tunnelExecutable = [System.IO.Path]::GetFullPath((Join-Path $runtimeDirectory 'cloudflared.exe'))
if (-not (Test-Path -LiteralPath $tunnelExecutable)) { throw 'cloudflared.exe is missing from backend/.local/paymongo' }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw 'Backend build failed' }

# Reuse only the dedicated tunnel process recorded by this setup.
$tunnelProcess = $null
$tunnelPidFile = Join-Path $runtimeDirectory 'tunnel.pid'
if (Test-Path -LiteralPath $tunnelPidFile) {
  $recordedTunnelId = [int](Get-Content -LiteralPath $tunnelPidFile)
  $candidate = Get-CimInstance Win32_Process -Filter "ProcessId = $recordedTunnelId"
  if ($candidate -and $candidate.ExecutablePath -eq $tunnelExecutable -and $candidate.CommandLine -match '127\.0\.0\.1:5051') {
    $tunnelProcess = Get-Process -Id $recordedTunnelId
  }
}
if (-not $tunnelProcess) {
  $tunnelProcess = Start-Process -FilePath $tunnelExecutable -ArgumentList @('tunnel','--url','http://127.0.0.1:5051','--no-autoupdate','--protocol','http2') -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $runtimeDirectory 'tunnel.stdout.log') -RedirectStandardError (Join-Path $runtimeDirectory 'tunnel.stderr.log')
  $tunnelProcess.Id | Set-Content -LiteralPath $tunnelPidFile
}
$publicOrigin = $null
for ($attempt = 0; $attempt -lt 60; $attempt++) {
  $logFile = Join-Path $runtimeDirectory 'tunnel.stderr.log'
  if (Test-Path -LiteralPath $logFile) {
    $logText = Get-Content -LiteralPath $logFile -Raw
    if ($logText) {
      $urlMatch = [regex]::Match($logText, 'https://[a-z0-9-]+\.trycloudflare\.com')
      if ($urlMatch.Success) { $publicOrigin = $urlMatch.Value; break }
    }
  }
  Start-Sleep -Milliseconds 500
}
if (-not $publicOrigin) { throw 'Tunnel did not return an HTTPS URL; inspect .local/paymongo/tunnel.stderr.log' }
& node --env-file=.env.test dist/commands/paymongo-register-webhook.js ($publicOrigin + '/api/v1/webhooks/paymongo')
if ($LASTEXITCODE -ne 0) { throw 'PayMongo webhook registration failed' }

# Refresh the receiver so it reads the saved signing secret.
$receiverPidFile = Join-Path $runtimeDirectory 'receiver.pid'
if (Test-Path -LiteralPath $receiverPidFile) {
  $recordedReceiverId = [int](Get-Content -LiteralPath $receiverPidFile)
  $candidate = Get-CimInstance Win32_Process -Filter "ProcessId = $recordedReceiverId"
  if ($candidate -and $candidate.CommandLine -match 'dist/commands/paymongo-webhook-server\.js') {
    Stop-Process -Id $recordedReceiverId
  }
}
$receiver = Start-Process -FilePath (Get-Command node.exe).Source -ArgumentList @('--env-file=.env.test','dist/commands/paymongo-webhook-server.js') `
  -WorkingDirectory $backendDirectory -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $runtimeDirectory 'receiver.stdout.log') `
  -RedirectStandardError (Join-Path $runtimeDirectory 'receiver.stderr.log')
$receiver.Id | Set-Content -LiteralPath $receiverPidFile
Write-Output ('PayMongo test webhook: ' + $publicOrigin + '/api/v1/webhooks/paymongo')
Write-Output 'Tunnel and receiver are running in the background. Logs and process IDs are in backend/.local/paymongo.'
