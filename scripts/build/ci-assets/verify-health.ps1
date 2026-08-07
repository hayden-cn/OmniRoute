param(
  [string]$Host = "localhost",
  [int]$Port = 20128
)

$url = "http://${Host}:${Port}/api/monitoring/health"

try {
  $r = Invoke-RestMethod -Uri $url -Method Get -TimeoutSec 15
  Write-Host "OK  $url" -ForegroundColor Green
  $r | ConvertTo-Json -Depth 4
} catch {
  Write-Error "FAIL $url  $($_.Exception.Message)"
  exit 1
}
