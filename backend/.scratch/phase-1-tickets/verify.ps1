$ErrorActionPreference = 'Stop'
$verifyGh = 'C:/Program Files/GitHub CLI/gh.exe'
$verifyRepo = 'AxIon-200/aventix-development'
$verifyPlan = [IO.File]::ReadAllText((Join-Path (Get-Location) '.scratch/phase-1-tickets/manifest.json')) | ConvertFrom-Json
$verifyPublished = Get-Content '.scratch/phase-1-tickets/published.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$verifyBefore = Get-Content '.scratch/phase-1-tickets/parent-before.json' -Raw -Encoding UTF8 | ConvertFrom-Json
$verifyParent = (& $verifyGh issue view 33 --repo $verifyRepo --json title,body,state) | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Parent read failed' }
foreach ($field in @('title','body','state')) {
  if ($verifyParent.$field -cne $verifyBefore.$field) { throw "Parent changed: $field" }
}
$verifyChildren = (& $verifyGh api repos/AxIon-200/aventix-development/issues/33/sub_issues --paginate) | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Sub-issue read failed' }
if ($verifyPublished.Count -ne 10) { throw 'Expected 10 published tickets' }
foreach ($entry in $verifyPublished) {
  $child = $verifyChildren | Where-Object { $_.number -eq $entry.number }
  $spec = $verifyPlan | Where-Object { $_.n -eq $entry.ticket }
  if (-not $child) { throw "Missing parent link: $($entry.number)" }
  if ('ready-for-agent' -notin $child.labels.name) { throw 'Missing label' }
  if ($child.title -cne $spec.title) { throw 'Title mismatch' }
  $expectedBody = [IO.File]::ReadAllText((Join-Path (Get-Location) $spec.bodyFile))
  if ($child.body.Replace("`r`n","`n").TrimEnd() -cne $expectedBody.Replace("`r`n","`n").TrimEnd()) {
    throw "Body mismatch: $($entry.number)"
  }
  $dependencies = (& $verifyGh api "repos/AxIon-200/aventix-development/issues/$($entry.number)/dependencies/blocked_by") | ConvertFrom-Json
  if ($LASTEXITCODE -ne 0) { throw 'Dependency read failed' }
  $actual = (@($dependencies | ForEach-Object { $_.number } | Sort-Object) -join ',')
  $expectedNumbers = @()
  foreach ($block in $spec.blocks) {
    $expectedNumbers += ($verifyPublished | Where-Object { $_.ticket -eq $block }).number
  }
  $expected = (@($expectedNumbers | Sort-Object) -join ',')
  if ($actual -cne $expected) { throw "Dependency mismatch: $($entry.number)" }
  Write-Output "Verified #$($entry.number): parent #33; ready-for-agent; blockers [$actual]"
}
Write-Output 'Parent title/body/state unchanged. All 10 ticket bodies, titles, labels, parent links, and blocking edges verified.'
