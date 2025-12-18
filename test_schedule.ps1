# テスト用スクリプト：日付設定を個別に確認

# UTF-8エンコーディングを設定（文字化け対策）
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

# ghコマンドの出力をUTF-8として取得するヘルパー関数
function Get-GhJsonOutput {
    param([string]$Command)
    $tempFile = [System.IO.Path]::GetTempFileName() + ".json"
    try {
        $originalOutputEncoding = $OutputEncoding
        $OutputEncoding = [System.Text.Encoding]::UTF8
        
        $fullCommand = "gh $Command"
        Invoke-Expression "$fullCommand" | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
        
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        $content = [System.IO.File]::ReadAllText($tempFile, $utf8NoBom)
        
        $OutputEncoding = $originalOutputEncoding
        
        return $content.Trim()
    } catch {
        Write-Host "Error executing: $Command" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        return ""
    } finally {
        if (Test-Path $tempFile) {
            Remove-Item $tempFile -ErrorAction SilentlyContinue
        }
    }
}

$projectNumber = 1
$owner = "TomohikoSASANO"
$projectId = "PVT_kwHODOmDKs4BK2ra"

Write-Host "=== Testing Schedule Setting ===" -ForegroundColor Cyan
Write-Host ""

# 1. フィールド一覧を取得
Write-Host "1. Getting fields..." -ForegroundColor Yellow
$fieldsJson = Get-GhJsonOutput "gh project field-list $projectNumber --owner $owner --format json"
Write-Host "Fields JSON:" -ForegroundColor Gray
Write-Host $fieldsJson -ForegroundColor Gray
Write-Host ""

$fields = $fieldsJson | ConvertFrom-Json
$startDateFieldId = ($fields | Where-Object { $_.name -eq "Start Date" }).id
$targetDateFieldId = ($fields | Where-Object { $_.name -eq "Target Date" }).id

Write-Host "Start Date Field ID: $startDateFieldId" -ForegroundColor Cyan
Write-Host "Target Date Field ID: $targetDateFieldId" -ForegroundColor Cyan
Write-Host ""

# 2. プロジェクトアイテムを取得
Write-Host "2. Getting project items..." -ForegroundColor Yellow
Write-Host "  Using project number: $projectNumber, owner: $owner" -ForegroundColor Gray

# 直接コマンドを実行して確認
Write-Host "  Testing direct command..." -ForegroundColor Gray
$directOutput = gh project item-list $projectNumber --owner $owner --format json 2>&1
Write-Host "  Direct output length: $($directOutput.Length)" -ForegroundColor Gray
if ($directOutput.Length -gt 0) {
    Write-Host "  Direct output (first 200 chars): $($directOutput.Substring(0, [Math]::Min(200, $directOutput.Length)))" -ForegroundColor Gray
}

# Get-GhJsonOutput関数を使用
$itemsJson = Get-GhJsonOutput "gh project item-list $projectNumber --owner $owner --format json"
Write-Host "  Items JSON length: $($itemsJson.Length)" -ForegroundColor Gray
if ($itemsJson.Length -gt 0) {
    Write-Host "  Items JSON (first 200 chars): $($itemsJson.Substring(0, [Math]::Min(200, $itemsJson.Length)))" -ForegroundColor Gray
    $items = $itemsJson | ConvertFrom-Json
} else {
    Write-Host "  Warning: Empty JSON response" -ForegroundColor Yellow
    # 直接コマンドの結果を試す
    if ($directOutput.Length -gt 0 -and $directOutput -notmatch "error|Error") {
        Write-Host "  Trying direct output..." -ForegroundColor Yellow
        $items = $directOutput | ConvertFrom-Json
    } else {
        $items = @()
    }
}

Write-Host "Found $($items.Count) items" -ForegroundColor Gray
foreach ($item in $items) {
    Write-Host "  Item ID: $($item.id), URL: $($item.content.url)" -ForegroundColor Gray
}
Write-Host ""

# 3. Issue #1のアイテムを取得
Write-Host "3. Finding Issue #1..." -ForegroundColor Yellow
$issue1Url = "https://github.com/TomohikoSASANO/task-map/issues/1"
$item1 = $items | Where-Object { $_.content.url -eq $issue1Url }

if ($item1) {
    Write-Host "  Found Item ID: $($item1.id)" -ForegroundColor Green
    
    # Start Dateを設定
    if ($startDateFieldId) {
        Write-Host "  Setting Start Date to 2025-12-18..." -ForegroundColor Yellow
        $result = gh project item-edit --id $item1.id --field-id $startDateFieldId --project-id $projectId --date 2025-12-18 2>&1
        Write-Host "  Result: $result" -ForegroundColor Gray
        Write-Host "  Exit Code: $LASTEXITCODE" -ForegroundColor Gray
    }
    
    # Target Dateを設定
    if ($targetDateFieldId) {
        Write-Host "  Setting Target Date to 2025-12-25..." -ForegroundColor Yellow
        $result = gh project item-edit --id $item1.id --field-id $targetDateFieldId --project-id $projectId --date 2025-12-25 2>&1
        Write-Host "  Result: $result" -ForegroundColor Gray
        Write-Host "  Exit Code: $LASTEXITCODE" -ForegroundColor Gray
    }
} else {
    Write-Host "  Item not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Green

