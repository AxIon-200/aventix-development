$ErrorActionPreference = 'Stop'
$gh = 'C:/Program Files/GitHub CLI/gh.exe'
$repo = 'AxIon-200/aventix-development'
$title = 'S01: Attendee authentication integration'
$children = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'published.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$children = @($children | Sort-Object draft)
if ($children.Count -ne 8) { throw 'Expected eight published S01 tickets.' }
function Invoke-GhJson([string[]]$Arguments) {
  $raw = & $gh @Arguments
  if ($LASTEXITCODE -ne 0) { throw ('GitHub operation failed: ' + ($Arguments -join ' ')) }
  return (($raw -join "`n") | ConvertFrom-Json)
}
$matches = @(Invoke-GhJson -Arguments @('issue', 'list', '--repo', $repo, '--state', 'all', '--search', 'S01 in:title', '--limit', '100', '--json', 'number,title,url') | Where-Object title -eq $title)
if ($matches.Count -gt 1) { throw 'Multiple matching parents; refusing to create another.' }
if ($matches.Count -eq 1) {
  $parentNumber = $matches[0].number
} else {
  $url = & $gh issue create --repo $repo --title $title --label 'ready-for-agent' --body-file (Join-Path $PSScriptRoot 'parent-issue.md')
  if ($LASTEXITCODE -ne 0) { throw 'Parent creation failed; inspect GitHub before retrying.' }
  $parentNumber = [int](($url -join '').Trim().Split('/')[-1])
}
$parent = Invoke-GhJson -Arguments @('api', ('repos/' + $repo + '/issues/' + $parentNumber))
if ($parent.state -ne 'open') { throw 'Parent must remain open.' }
$parentRecord = [pscustomobject]@{ number = $parent.number; id = $parent.id; title = $parent.title; url = $parent.html_url }
[System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'parent.json'), (ConvertTo-Json -InputObject $parentRecord), [System.Text.UTF8Encoding]::new($false))
Write-Output ('Parent: ' + $parent.html_url)
$attached = @(Invoke-GhJson -Arguments @('api', ('repos/' + $repo + '/issues/' + $parent.number + '/sub_issues')))
foreach ($child in $children) {
  if (@($attached | Where-Object id -eq $child.id).Count -eq 0) {
    $null = Invoke-GhJson -Arguments @('api', '--method', 'POST', ('repos/' + $repo + '/issues/' + $parent.number + '/sub_issues'), '-F', ('sub_issue_id=' + $child.id))
    Write-Output ('Attached #' + $child.number)
  }
}
$verifiedChildren = @(Invoke-GhJson -Arguments @('api', ('repos/' + $repo + '/issues/' + $parent.number + '/sub_issues')))
if ($verifiedChildren.Count -ne 8 -or (($verifiedChildren.number | Sort-Object) -join ',') -ne (($children.number | Sort-Object) -join ',')) { throw 'Sub-issue membership verification failed.' }
foreach ($child in $children) {
  $verifiedParent = Invoke-GhJson -Arguments @('api', ('repos/' + $repo + '/issues/' + $child.number + '/parent'))
  if ($verifiedParent.id -ne $parent.id) { throw 'Child parent verification failed.' }
  $dependencies = @(Invoke-GhJson -Arguments @('api', ('repos/' + $repo + '/issues/' + $child.number + '/dependencies/blocked_by')))
  $expected = @($child.blockers | ForEach-Object { $draftId = $_; ($children | Where-Object draft -eq $draftId).number } | Sort-Object)
  $actual = @($dependencies | ForEach-Object number | Sort-Object)
  if (($expected -join ',') -ne ($actual -join ',')) { throw ('Dependencies changed for #' + $child.number) }
  Write-Output ('Verified #' + $child.number + ' belongs to #' + $parent.number + '; dependencies preserved')
}
