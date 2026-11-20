param(
  [Parameter(Mandatory)][ValidateSet('elementor','novamira')][string]$Server,
  [Parameter(Mandatory)][string]$Tool,
  [string]$ArgsJson = '{}',
  [int]$Max = 6000
)
# Legge URL e credenziali da ~/.claude.json (progetto artes) e chiama un tool MCP via JSON-RPC.
# Il file può contenere la stessa cartella con maiuscole diverse (C:/… e c:/…, a seconda di come si apre la
# finestra): ConvertFrom-Json normale va in errore, quindi si legge come hashtable e si sceglie la voce che ha
# davvero i server MCP.
$cfg = Get-Content "$env:USERPROFILE\.claude.json" -Raw | ConvertFrom-Json -AsHashTable
$proj = $cfg['projects'].GetEnumerator() | Where-Object { $_.Key -match 'github[/\\]artes$' -and $_.Value['mcpServers'] -and $_.Value['mcpServers']['artes-elementor'] } | Select-Object -First 1
$s = $proj.Value['mcpServers']
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
# Dalle versioni recenti del server (protocollo 2025-11-25) la versione negoziata va rimandata in ogni richiesta
# successiva, altrimenti risponde 400 "MCP-Protocol-Version header is required".
$ic = [string]$r.Content; if ($ic -match 'data:\s*(\{.*\})') { $ic = $Matches[1] }
try { $pv = ($ic | ConvertFrom-Json).result.protocolVersion } catch { $pv = $null }
if ($pv) { $h['MCP-Protocol-Version'] = [string]$pv }
Invoke-WebRequest $url -Method Post -Headers $h -ContentType 'application/json' -Body '{"jsonrpc":"2.0","method":"notifications/initialized"}' -UseBasicParsing | Out-Null
$body = '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"' + $Tool + '","arguments":' + $ArgsJson + '}}'
$t = Invoke-WebRequest $url -Method Post -Headers $h -ContentType 'application/json; charset=utf-8' -Body ([Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing -TimeoutSec 120
$c = $t.Content; if ($c -match 'data:\s*(\{.*\})') { $c = $Matches[1] }
$j = $c | ConvertFrom-Json
if ($j.error) { "ERROR: " + ($j.error | ConvertTo-Json -Depth 6); return }
$txt = ($j.result.content | ForEach-Object { $_.text }) -join "`n"
if (-not $txt) { $txt = $c }
$txt.Substring(0, [Math]::Min($Max, $txt.Length))

