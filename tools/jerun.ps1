param(
  [Parameter(Mandatory)][string]$Tool,
  [Parameter(Mandatory)][string]$BodyFile,
  [int]$Max = 5000
)
# Esegue un tool MCP di JetEngine su dev3 (rest_do_request interno come utente 1, con nonce wp_rest).
$body = Get-Content $BodyFile -Raw
$php = @"
`$input_data = json_decode(<<<'JSON'
$body
JSON
, true);
`$req = new WP_REST_Request('POST', '/jet-engine/v1/mcp-tools/run/$Tool');
`$req->set_header('content-type', 'application/json');
`$req->set_header('X-WP-Nonce', wp_create_nonce('wp_rest'));
`$p = ['input' => `$input_data];
`$req->set_body(wp_json_encode(`$p));
`$req->set_body_params(`$p);
`$res = rest_do_request(`$req);
return ['status' => `$res->get_status(), 'data' => `$res->get_data()];
"@
New-Item -ItemType Directory -Force (Join-Path $PSScriptRoot 'out') | Out-Null
$tmp = Join-Path $PSScriptRoot "out\jerun-$Tool.php"
Set-Content $tmp $php -Encoding utf8
& (Join-Path $PSScriptRoot 'php.ps1') -File $tmp -Max $Max

