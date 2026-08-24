$ErrorActionPreference = "Stop"
$packageRoot = $PSScriptRoot
$envPath = Join-Path $packageRoot ".env.local"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 22 or newer is required. Install it from https://nodejs.org first."
}

$nodeMajor = [int]((& node --version).TrimStart("v").Split(".")[0])
if ($nodeMajor -lt 22) {
  throw "Node.js 22 or newer is required. Installed major version: $nodeMajor"
}

if (Test-Path -LiteralPath $envPath) {
  $replace = Read-Host ".env.local already exists. Replace it? Type YES"
  if ($replace -ne "YES") { throw "Existing configuration was preserved." }
}

$supabaseUrl = (Read-Host "Supabase project URL (https://PROJECT.supabase.co)").Trim().TrimEnd("/")
if ($supabaseUrl -notmatch '^https?://[^\s]+$') { throw "Enter a valid Supabase URL." }

function Read-PlainSecret([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$supabaseKey = Read-PlainSecret "Supabase server secret key"
if ([string]::IsNullOrWhiteSpace($supabaseKey)) { throw "Supabase secret key is required." }
$passcode = Read-PlainSecret "Choose an inventory passcode (minimum 4 characters)"
$confirmation = Read-PlainSecret "Confirm the inventory passcode"
if ($passcode.Length -lt 4) { throw "Passcode must contain at least 4 characters." }
if ($passcode -cne $confirmation) { throw "Passcodes do not match." }
if ($passcode -cne $passcode.Trim()) { throw "Passcode cannot begin or end with whitespace." }

$hashScript = Join-Path $packageRoot "scripts\hash-passcode.mjs"
$secretScript = Join-Path $packageRoot "scripts\generate-session-secret.mjs"
$passcodeHash = ($passcode | & node $hashScript --stdin).Trim()
$hashExitCode = $LASTEXITCODE
$sessionSecret = (& node $secretScript).Trim()
$secretExitCode = $LASTEXITCODE
if ($hashExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($passcodeHash)) { throw "Passcode hashing failed." }
if ($secretExitCode -ne 0 -or [string]::IsNullOrWhiteSpace($sessionSecret)) { throw "Session secret generation failed." }

$timeout = (Read-Host "Session timeout in minutes [480]").Trim()
if ([string]::IsNullOrWhiteSpace($timeout)) { $timeout = "480" }
$parsedTimeout = 0
if (-not [int]::TryParse($timeout, [ref]$parsedTimeout) -or $parsedTimeout -lt 5 -or $parsedTimeout -gt 10080) {
  throw "Session timeout must be between 5 and 10080 minutes."
}

$lines = @(
  "SUPABASE_URL=$supabaseUrl",
  "SUPABASE_SECRET_KEY=$supabaseKey",
  "PASSCODE_HASH=$passcodeHash",
  "SESSION_SECRET=$sessionSecret",
  "SESSION_TIMEOUT_MINUTES=$parsedTimeout"
)
[IO.File]::WriteAllLines($envPath, $lines, [Text.UTF8Encoding]::new($false))

$passcode = $null
$confirmation = $null
$supabaseKey = $null
Write-Host "Secure configuration created at $envPath" -ForegroundColor Green
