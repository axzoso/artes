param([Parameter(Mandatory)][string]$Url, [Parameter(Mandatory)][string]$Out, [int]$W = 1440, [int]$H = 3000)
# Screenshot a larghezza fissa con Chrome headless (il sito di sviluppo mostra un banner WPML in basso: è normale).
$b = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe", "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
& $b --headless=new --disable-gpu --hide-scrollbars --user-data-dir="$PSScriptRoot\out\chrome-profile" --window-size="$W,$H" --virtual-time-budget=8000 --screenshot="$Out" $Url 2>&1 | Out-Null
Get-Item $Out | Select-Object Name, Length

