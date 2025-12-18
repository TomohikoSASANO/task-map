# GitHub ProjectにIssuesを追加するスクリプト

$projectNumber = 1
$owner = "TomohikoSASANO"

Write-Host "Fetching all issues..." -ForegroundColor Green
$issues = gh issue list --json number,title,url --jq '.[]' | ConvertFrom-Json

if ($issues.Count -eq 0) {
    Write-Host "No issues found!" -ForegroundColor Yellow
    exit
}

Write-Host "Found $($issues.Count) issues" -ForegroundColor Green
Write-Host ""

foreach ($issue in $issues) {
    Write-Host "Adding Issue #$($issue.number): $($issue.title)" -ForegroundColor Cyan
    gh project item-add $projectNumber --owner $owner --url $issue.url
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Added successfully" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Failed to add" -ForegroundColor Red
    }
    Start-Sleep -Seconds 1
}

Write-Host ""
Write-Host "All issues added to project!" -ForegroundColor Green

