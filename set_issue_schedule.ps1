# GitHub ProjectのIssuesにスケジュールを設定するスクリプト
# 1ヶ月で終わるように、タスクの難易度に応じてスケジュールを設定

# UTF-8エンコーディングを設定（文字化け対策）
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 | Out-Null

$projectNumber = 1
$owner = "TomohikoSASANO"
$projectId = "PVT_kwHODOmDKs4BK2ra"

Write-Host "Setting up schedules for GitHub Issues..." -ForegroundColor Green
Write-Host ""

# ghコマンドの出力をUTF-8として取得するヘルパー関数
function Get-GhJsonOutput {
    param([string]$Command)
    $tempFile = [System.IO.Path]::GetTempFileName() + ".json"
    try {
        # ghコマンドを実行して一時ファイルに保存（UTF-8として）
        # PowerShellの$OutputEncodingをUTF-8に設定
        $originalOutputEncoding = $OutputEncoding
        $OutputEncoding = [System.Text.Encoding]::UTF8
        
        # ghコマンドを実行して出力を一時ファイルに保存
        $fullCommand = "gh $Command"
        Invoke-Expression "$fullCommand" | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline
        
        # UTF-8として読み込む（BOMなし）
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        $content = [System.IO.File]::ReadAllText($tempFile, $utf8NoBom)
        
        # エンコーディングを元に戻す
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

# 1. カスタムフィールドが存在するか確認し、なければ作成
Write-Host "Checking/Creating custom fields..." -ForegroundColor Cyan
$fieldsJson = Get-GhJsonOutput "gh project field-list $projectNumber --owner $owner --format json"
Write-Host "Fields JSON: $fieldsJson" -ForegroundColor Gray
$fields = $fieldsJson | ConvertFrom-Json
Write-Host "Found $($fields.Count) fields" -ForegroundColor Gray

$startDateFieldId = $null
$targetDateFieldId = $null

foreach ($field in $fields) {
    if ($field.name -eq "Start Date") {
        $startDateFieldId = $field.id
        Write-Host "  Found 'Start Date' field (ID: $startDateFieldId)" -ForegroundColor Green
    }
    if ($field.name -eq "Target Date") {
        $targetDateFieldId = $field.id
        Write-Host "  Found 'Target Date' field (ID: $targetDateFieldId)" -ForegroundColor Green
    }
}

# Start Dateフィールドが存在しない場合は作成
if (-not $startDateFieldId) {
    Write-Host "Creating 'Start Date' field..." -ForegroundColor Yellow
    gh project field-create $projectNumber --owner $owner --name "Start Date" --data-type DATE | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Created 'Start Date' field" -ForegroundColor Green
        $fieldsJson = Get-GhJsonOutput "gh project field-list $projectNumber --owner $owner --format json"
        $fields = $fieldsJson | ConvertFrom-Json
        $startDateFieldId = ($fields | Where-Object { $_.name -eq "Start Date" }).id
    } else {
        Write-Host "  Failed to create 'Start Date' field" -ForegroundColor Red
    }
} else {
    Write-Host "  'Start Date' field exists" -ForegroundColor Green
}

# Target Dateフィールドが存在しない場合は作成
if (-not $targetDateFieldId) {
    Write-Host "Creating 'Target Date' field..." -ForegroundColor Yellow
    gh project field-create $projectNumber --owner $owner --name "Target Date" --data-type DATE | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Created 'Target Date' field" -ForegroundColor Green
        $fieldsJson = Get-GhJsonOutput "gh project field-list $projectNumber --owner $owner --format json"
        $fields = $fieldsJson | ConvertFrom-Json
        $targetDateFieldId = ($fields | Where-Object { $_.name -eq "Target Date" }).id
    } else {
        Write-Host "  Failed to create 'Target Date' field" -ForegroundColor Red
    }
} else {
    Write-Host "  'Target Date' field exists" -ForegroundColor Green
}

Write-Host ""

# 2. 今日の日付を取得
$today = Get-Date
$startDate = $today.ToString("yyyy-MM-dd")

# Issueごとのスケジュール設定
$schedule1 = @{
    Title = "Deploy Environment Stabilization"
    StartDate = $startDate
    TargetDate = ($today.AddDays(7)).ToString("yyyy-MM-dd")
}

$schedule2 = @{
    Title = "Development System Setup"
    StartDate = ($today.AddDays(7)).ToString("yyyy-MM-dd")
    TargetDate = ($today.AddDays(14)).ToString("yyyy-MM-dd")
}

$schedules = @{
    "1" = $schedule1
    "2" = $schedule2
}

# 3. すべてのIssuesを取得してスケジュールを設定
Write-Host "Setting schedules for Issues..." -ForegroundColor Cyan
$issuesJson = Get-GhJsonOutput "gh issue list --json number,title,url"
$issues = $issuesJson | ConvertFrom-Json

foreach ($issue in $issues) {
    $issueNum = $issue.number.ToString()
    
    if ($schedules.ContainsKey($issueNum)) {
        $schedule = $schedules[$issueNum]
        Write-Host ""
        Write-Host "Issue #$issueNum : $($schedule.Title)" -ForegroundColor Cyan
        Write-Host "  Start Date: $($schedule.StartDate)" -ForegroundColor Yellow
        Write-Host "  Target Date: $($schedule.TargetDate)" -ForegroundColor Yellow
        
        # プロジェクトアイテムのIDを取得
        $itemsJson = Get-GhJsonOutput "gh project item-list $projectNumber --owner $owner --format json"
        if ($itemsJson.Length -gt 0) {
            $items = $itemsJson | ConvertFrom-Json
        } else {
            Write-Host "  Warning: Empty items response" -ForegroundColor Yellow
            $items = @()
        }
        $item = $items | Where-Object { $_.content.url -eq $issue.url }
        
        if ($item) {
            $itemId = $item.id
            Write-Host "  Item ID: $itemId" -ForegroundColor Gray
            
            # Start Dateを設定
            if ($startDateFieldId) {
                Write-Host "  Setting Start Date..." -ForegroundColor Gray
                Write-Host "    Field ID: $startDateFieldId" -ForegroundColor Gray
                Write-Host "    Date: $($schedule.StartDate)" -ForegroundColor Gray
                $errorOutput = gh project item-edit --id $itemId --field-id $startDateFieldId --project-id $projectId --date $schedule.StartDate 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "    Start Date set successfully" -ForegroundColor Green
                } else {
                    Write-Host "    Failed to set Start Date" -ForegroundColor Red
                    Write-Host "    Error: $errorOutput" -ForegroundColor Red
                }
            } else {
                Write-Host "  Start Date field ID not found" -ForegroundColor Yellow
            }
            
            # Target Dateを設定
            if ($targetDateFieldId) {
                Write-Host "  Setting Target Date..." -ForegroundColor Gray
                Write-Host "    Field ID: $targetDateFieldId" -ForegroundColor Gray
                Write-Host "    Date: $($schedule.TargetDate)" -ForegroundColor Gray
                $errorOutput = gh project item-edit --id $itemId --field-id $targetDateFieldId --project-id $projectId --date $schedule.TargetDate 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "    Target Date set successfully" -ForegroundColor Green
                } else {
                    Write-Host "    Failed to set Target Date" -ForegroundColor Red
                    Write-Host "    Error: $errorOutput" -ForegroundColor Red
                }
            } else {
                Write-Host "  Target Date field ID not found" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  Project item not found for this issue" -ForegroundColor Red
        }
    } else {
        $issueTitle = $issue.title
        Write-Host "No schedule defined for Issue #$issueNum : $issueTitle" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Schedule setting completed!" -ForegroundColor Green
Write-Host "Project URL: https://github.com/users/$owner/projects/$projectNumber" -ForegroundColor Cyan

