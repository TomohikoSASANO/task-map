# IssuesがProjectに追加されているか確認し、追加されていない場合は追加するスクリプト

$projectNumber = 1
$owner = "TomohikoSASANO"

Write-Host "=== Verifying and Adding Issues to Project ===" -ForegroundColor Cyan
Write-Host ""

# 1. Issuesを取得
Write-Host "1. Fetching issues..." -ForegroundColor Yellow
$issues = gh issue list --json number,title,url | ConvertFrom-Json

if ($issues.Count -eq 0) {
    Write-Host "No issues found!" -ForegroundColor Yellow
    exit
}

Write-Host "Found $($issues.Count) issues" -ForegroundColor Green
foreach ($issue in $issues) {
    Write-Host "  Issue #$($issue.number): $($issue.title)" -ForegroundColor Gray
}
Write-Host ""

# 2. Projectアイテムを取得
Write-Host "2. Checking project items..." -ForegroundColor Yellow
$projectItems = gh project item-list $projectNumber --owner $owner --format json | ConvertFrom-Json

Write-Host "Found $($projectItems.Count) items in project" -ForegroundColor Gray
foreach ($item in $projectItems) {
    Write-Host "  Item: $($item.content.url)" -ForegroundColor Gray
}
Write-Host ""

# 3. 追加されていないIssuesを追加
Write-Host "3. Adding missing issues..." -ForegroundColor Yellow
$addedCount = 0
$skippedCount = 0

foreach ($issue in $issues) {
    $exists = $projectItems | Where-Object { $_.content.url -eq $issue.url }
    
    if ($exists) {
        Write-Host "  Issue #$($issue.number) already in project - skipping" -ForegroundColor Gray
        $skippedCount++
    } else {
        Write-Host "  Adding Issue #$($issue.number): $($issue.title)" -ForegroundColor Cyan
        $result = gh project item-add $projectNumber --owner $owner --url $issue.url 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ Added successfully" -ForegroundColor Green
            $addedCount++
        } else {
            Write-Host "    ✗ Failed: $result" -ForegroundColor Red
        }
        Start-Sleep -Seconds 1
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Added: $addedCount" -ForegroundColor Green
Write-Host "  Skipped: $skippedCount" -ForegroundColor Gray
Write-Host "  Total issues: $($issues.Count)" -ForegroundColor Gray
Write-Host ""

# 4. 最終確認
Write-Host "4. Final verification..." -ForegroundColor Yellow
$finalItems = gh project item-list $projectNumber --owner $owner --format json | ConvertFrom-Json
Write-Host "Total items in project: $($finalItems.Count)" -ForegroundColor Green


