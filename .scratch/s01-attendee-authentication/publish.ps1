$ErrorActionPreference = 'Stop'
$gh = 'C:/Program Files/GitHub CLI/gh.exe'
$repo = 'AxIon-200/aventix-development'
$taskRoot = $PSScriptRoot
$issueFiles = @(Get-ChildItem -LiteralPath (Join-Path $taskRoot 'issues') -Filter '*.md' | Sort-Object Name)
if ($issueFiles.Count -ne 8) { throw 'Expected eight approved drafts.' }
$utf8 = [System.Text.UTF8Encoding]::new($false)
$records = @{}
$journalPath = Join-Path $taskRoot 'published.json'
if (Test-Path -LiteralPath $journalPath) {
  foreach ($record in @(Get-Content -LiteralPath $journalPath -Raw -Encoding UTF8 | ConvertFrom-Json)) {
    $records[[int]$record.draft] = $record
  }
}
$titles = @{}
foreach ($file in $issueFiles) {
  $match = [regex]::Match([System.IO.File]::ReadAllText($file.FullName), '^# Draft (\d+): (.+)')
  if (-not $match.Success) { throw 'Invalid draft heading.' }
  $titles[[int]$match.Groups[1].Value] = $match.Groups[2].Value.Trim()
}
function Invoke-GhJson([string[]]$Arguments) {
  $raw = & $gh @Arguments
  if ($LASTEXITCODE -ne 0) { throw ('GitHub operation failed: ' + ($Arguments -join ' ')) }
  return (($raw -join "`n") | ConvertFrom-Json)
}
function Save-Journal {
  $ordered = @($records.Values | Sort-Object draft)
  [System.IO.File]::WriteAllText($journalPath, (ConvertTo-Json -InputObject $ordered -Depth 8), $utf8)
}
$existing = @(Invoke-GhJson -Arguments @('issue', 'list', '--repo', $repo, '--state', 'all', '--limit', '200', '--json', 'number,title,url'))
foreach ($file in $issueFiles) {
  $draft = [int]$file.Name.Substring(0, 2)
  $title = 'S01: ' + $titles[$draft]
  $text = [System.IO.File]::ReadAllText($file.FullName)
  $blockerIds = @()
  $blockerMatch = [regex]::Match($text, '(?s)## Blocked by\s*\n(.*?)(?=\n## |\z)')
  foreach ($edge in [regex]::Matches($blockerMatch.Groups[1].Value, '(?m)^- Draft (\d+):')) {
    $blockerIds += [int]$edge.Groups[1].Value
  }
  $text = [regex]::Replace($text, '^# Draft \d+: [^\r\n]+\r?\n\r?\n', '')
  $text = [regex]::Replace($text, '(?s)## Blocked by\s*\n.*?(?=\n## |\z)', '')
  if ($draft -eq 1) { $sourceUrl = '#approved-s01-specification' }
  else { $sourceUrl = $records[1].url + '#approved-s01-specification' }
  $text = $text.Replace('../../../backend/docs/specs/s01-attendee-authentication-spec.md', $sourceUrl)
  $text = $text.Replace('The proposed public HTTP testing seam remains subject to approval with this breakdown.', 'The user approved the public HTTP testing seam and eight-ticket breakdown on 2026-10-21.')
  $text = $text.Replace('Use the proposed existing public application HTTP boundary:', 'Use the approved existing public application HTTP boundary:')
  $text = $text.Replace('Test-seam confirmation is part of breakdown approval.', 'The user approved this test seam with the breakdown on 2026-10-21.')
  foreach ($key in @($titles.Keys)) {
    $pattern = '(?i)draft\s+0?' + $key + '\b'
    $text = [regex]::Replace($text, $pattern, $titles[$key])
  }
  if ($draft -eq 1) { $text += "`n## Blocked by`n`nNone (can start immediately).`n" }
  if ($draft -eq 1) {
    $sourcePath = Join-Path (Get-Location) 'backend/docs/specs/s01-attendee-authentication-spec.md'
    $snapshot = [System.IO.File]::ReadAllText($sourcePath)
    $snapshot = [regex]::Replace($snapshot, '(?m)^Status:.*\r?\nGitHub ticket publication in progress\.\r?\n', '')
    $snapshot = [regex]::Replace($snapshot, '(?m)^- Published issue:.*$', '')
    $sourceDirectory = Split-Path -Parent $sourcePath
    $repoDirectory = (Get-Location).Path
    $snapshot = [regex]::Replace($snapshot, '\]\((?!https?://|#)([^)]+)\)', [System.Text.RegularExpressions.MatchEvaluator]{
      param($link)
      $parts = $link.Groups[1].Value.Split('#', 2)
      $resolved = [System.IO.Path]::GetFullPath((Join-Path $sourceDirectory $parts[0]))
      if (-not $resolved.StartsWith($repoDirectory + [System.IO.Path]::DirectorySeparatorChar)) { throw 'Source link leaves repository.' }
      $relative = $resolved.Substring($repoDirectory.Length + 1).Replace('\', '/')
      $destination = 'https://github.com/' + $repo + '/blob/main/' + $relative
      if ($parts.Count -eq 2) { $destination += '#' + $parts[1] }
      return '](' + $destination + ')'
    })
    $text += "`n## Approved S01 specification`n`nThe approved source specification is included below because its repository file is still local. Links inside this snapshot point to repository documents; newly drafted documents may also await repository publication. Ticket publication does not start application implementation or lift activation gates.`n`n<details>`n<summary>Read the approved specification</summary>`n`n" + $snapshot.Trim() + "`n`n</details>`n"
  }
  $bodyPath = Join-Path $taskRoot ('publish-' + $file.Name)
  [System.IO.File]::WriteAllText($bodyPath, $text.Trim() + "`n", $utf8)
  if (-not $records.ContainsKey($draft)) {
    $matches = @($existing | Where-Object title -eq $title)
    if ($matches.Count -gt 1) { throw ('Duplicate title: ' + $title) }
    if ($matches.Count -eq 1) { $url = $matches[0].url }
    else {
      $url = & $gh issue create --repo $repo --title $title --label 'ready-for-agent' --body-file $bodyPath
      if ($LASTEXITCODE -ne 0) { throw ('Issue creation failed for draft ' + $draft + '; inspect GitHub before retrying.') }
      $url = ($url -join '').Trim()
    }
    $number = [int]($url.Split('/')[-1])
    $details = Invoke-GhJson -Arguments @('api', ('repos/' + $repo + '/issues/' + $number))
    $records[$draft] = [pscustomobject]@{ draft = $draft; number = $number; id = $details.id; title = $title; url = $url; blockers = $blockerIds }
    Save-Journal
    Write-Output ('Published ' + $url)
  }
  $current = $records[$draft]
  $existingEdges = @(Invoke-GhJson -Arguments @('api', ('repos/' + $repo + '/issues/' + $current.number + '/dependencies/blocked_by')))
  foreach ($blocker in $blockerIds) {
    if (-not $records.ContainsKey($blocker)) { throw 'Blocker must be published first.' }
    $blocking = $records[$blocker]
    if (@($existingEdges | Where-Object id -eq $blocking.id).Count -eq 0) {
      $null = Invoke-GhJson -Arguments @('api', '--method', 'POST', ('repos/' + $repo + '/issues/' + $current.number + '/dependencies/blocked_by'), '-F', ('issue_id=' + $blocking.id))
      Write-Output ('Dependency: #' + $current.number + ' blocked by #' + $blocking.number)
    }
  }
}
foreach ($record in @($records.Values | Sort-Object draft)) {
  $remote = Invoke-GhJson -Arguments @('api', ('repos/' + $repo + '/issues/' + $record.number))
  $edges = @(Invoke-GhJson -Arguments @('api', ('repos/' + $repo + '/issues/' + $record.number + '/dependencies/blocked_by')))
  $actual = @($edges | ForEach-Object { [long]$_.id } | Sort-Object)
  $expected = @($record.blockers | ForEach-Object { [long]$records[[int]$_].id } | Sort-Object)
  if (($actual -join ',') -ne ($expected -join ',')) { throw ('Dependency verification failed for #' + $record.number) }
  if ($remote.state -ne 'open' -or @($remote.labels | Where-Object name -eq 'ready-for-agent').Count -ne 1) { throw 'Issue state or label verification failed.' }
  if ($remote.body -match '\.\./\.\./\.\./|# Draft|## Parent') { throw 'Unresolved local reference or unexpected parent.' }
  Write-Output ('Verified #' + $record.number + ': ' + $record.title)
}
