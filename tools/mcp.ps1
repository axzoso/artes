param(
  [Parameter(Mandatory)][ValidateSet('elementor','novamira')][string]$Server,
  [Parameter(Mandatory)][string]$Tool,
  [string]$ArgsJson = '{}',
  [int]$Max = 6000
)
# Legge URL e credenziali da ~/.claude.json (progetto artes) e chiama un tool MCP via JSON-RPC.
$cfg = Get-Content "$env:USERPROFILE\.claude.json" -Raw | ConvertFrom-Json
$proj = $cfg.projects.PSObject.Properties | Where-Object { $_.Name -match 'github.artes$' } | Select-Object -First 1
$s = $proj.Value.mcpServers
if ($Server -eq 'elementor') {
  $url = $s.'artes-elementor'.url.TrimEnd('/') + '/'
  $auth = $s.'artes-elementor'.headers.Authorization
} else {
  $e = $s.'novamira-dev3-minimalstud'.env
  $url = $e.WP_API_URL
  $auth = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($e.WP_API_USERNAME):$($e.WP_API_PASSWORD)"))
}
$h = @{ Authorization = $auth; Accept = 'application/json, text/event-stream' }
$init = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"probe","version":"1"}}}'
$r = Invoke-WebRequest $url -Method Post -Headers $h -ContentType 'application/json' -Body $init -UseBasicParsing -TimeoutSec 40
$h['Mcp-Session-Id'] = [string]$r.Headers['Mcp-Session-Id']
Invoke-WebRequest $url -Method Post -Headers $h -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"notifications/initialized"}' -UseBasicParsing | Out-Null
$body = '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"' + $Tool + '","arguments":' + $ArgsJson + '}}'
$t = Invoke-WebRequest $url -Method Post -Headers $h -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing -TimeoutSec 120
$c = $t.Content; if ($c -match 'data:\s*(\{.*\})') { $c = $Matches[1] }
$j = $c | ConvertFrom-Json
if ($j.error) { "ERROR: " + ($j.error | ConvertTo-Json -Depth 6); return }
$txt = ($j.result.content | ForEach-Object { $_.text }) -join "`n"
if (-not $txt) { $txt = $c }
$txt.Substring(0, [Math]::Min($Max, $txt.Length))

