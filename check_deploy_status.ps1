# デプロイ状況を確認するスクリプト

Write-Host "=== デプロイ状況の確認 ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. ローカルの最新コミット:" -ForegroundColor Yellow
git log --oneline -3
Write-Host ""

Write-Host "2. リモートの最新コミット:" -ForegroundColor Yellow
git log origin/main --oneline -3
Write-Host ""

Write-Host "3. プッシュされていないコミット:" -ForegroundColor Yellow
$unpushed = git log origin/main..HEAD --oneline
if ($unpushed) {
    Write-Host $unpushed -ForegroundColor Red
} else {
    Write-Host "なし（すべてプッシュ済み）" -ForegroundColor Green
}
Write-Host ""

Write-Host "4. GitHubの最新コミット:" -ForegroundColor Yellow
$latestCommit = gh api repos/TomohikoSASANO/task-map/commits --jq '.[0] | "\(.sha[0:7]) | \(.commit.message)"'
Write-Host $latestCommit
Write-Host ""

Write-Host "5. GitHub Actionsの最新ワークフロー実行:" -ForegroundColor Yellow
gh run list --limit 3
Write-Host ""

Write-Host "6. ワークフローファイルの状態:" -ForegroundColor Yellow
if (Test-Path ".github/workflows/deploy.yml") {
    Write-Host "ファイル存在: OK" -ForegroundColor Green
    $workflowName = Select-String -Path ".github/workflows/deploy.yml" -Pattern "^name:" | Select-Object -First 1
    Write-Host "ワークフロー名: $($workflowName.Line)"
} else {
    Write-Host "ファイル存在: NG" -ForegroundColor Red
}
Write-Host ""

Write-Host "7. nginx-task.confの状態:" -ForegroundColor Yellow
if (Test-Path "nginx-task.conf") {
    Write-Host "ファイル存在: OK" -ForegroundColor Green
} else {
    Write-Host "ファイル存在: NG" -ForegroundColor Red
}


