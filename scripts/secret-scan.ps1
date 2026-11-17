$ErrorActionPreference = 'Continue'
$problems = 0

Write-Host "1. Tracked env files (only .env.example is expected):"
$envFiles = git ls-files | Where-Object { $_ -match '(^|/)\.env' }
$envFiles | ForEach-Object { Write-Host "   $_" }
if ($envFiles | Where-Object { $_ -notmatch '\.env\.example$' }) { $problems++; Write-Host "   PROBLEM: a real env file is tracked" }

Write-Host "2. Was .env.local or .env ever committed (any branch)?"
$ever = git log --all --oneline -- .env.local .env
if ($ever) { $problems++; Write-Host "   PROBLEM: found in history"; $ever | ForEach-Object { Write-Host "   $_" } } else { Write-Host "   no" }

$patterns = [ordered]@{
  'Google API key (AIza...)'         = 'AIza[0-9A-Za-z_-]{30,}'
  'reCAPTCHA site key (6L...)'       = '6L[0-9A-Za-z_-]{38}'
  'UUID (debug-token shape)'         = '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
  'private key block'                = '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'GitHub or generic token'          = '(ghp_|gho_|github_pat_|sk-[A-Za-z0-9]{20,})'
  'Indian-style 10-digit mobile'     = '(?<![0-9])[6-9][0-9]{9}(?![0-9])'
  'email address'                    = '[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}'
}

$revs = git rev-list --all
Write-Host "3. Searching all $($revs.Count) commits (file names only, values are never printed):"
foreach ($name in $patterns.Keys) {
  $hits = @()
  foreach ($rev in $revs) {
    $found = git grep -l -I -P $patterns[$name] $rev 2>$null
    if ($found) { $hits += $found | ForEach-Object { ($_ -split ':', 2)[1] } }
  }
  $files = $hits | Sort-Object -Unique
  if ($files) { Write-Host "   [$name] in:"; $files | ForEach-Object { Write-Host "      $_" } }
  else { Write-Host "   [$name] none" }
}

Write-Host "4. Built output (dist), if present:"
if (Test-Path dist) {
  $debugUuid = Get-ChildItem dist -Recurse -File | Select-String -Pattern $patterns['UUID (debug-token shape)'] -List
  if ($debugUuid) { $problems++; Write-Host "   PROBLEM: UUID-shaped string in dist:"; $debugUuid | ForEach-Object { Write-Host "      $($_.Path)" } } else { Write-Host "   no UUID-shaped strings" }
  $fake = Get-ChildItem dist -Recurse -File | Select-String -Pattern '__fakeModels' -List
  if ($fake) { $problems++; Write-Host "   PROBLEM: test hook in dist" } else { Write-Host "   no test hook" }
} else { Write-Host "   no dist folder (run npm run build first)" }

Write-Host "5. git status (.env.local must not be listed):"
git status --short
if ($problems -eq 0) { Write-Host "`nNo hard problems found. Read the lists above for the soft matches." } else { Write-Host "`n$problems hard problem(s) found. Do not submit until fixed." }
