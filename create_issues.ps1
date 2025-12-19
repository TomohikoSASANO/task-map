# GitHub Issues作成スクリプト
# tasks.mdの内容を基にGitHub Issuesを作成

$issues = @(
    @{
        Title = "デプロイ環境の安定化"
        Body = @"
## 説明
`task.kanazawa-application-support.jp`へのデプロイが正常に動作するようにする

## サブタスク
- [ ] Nginx設定の修正（`http`ブロック内に`include`を追加）
- [ ] Dockerコンテナ内へのファイルコピーの確認
- [ ] SSL証明書の確認
- [ ] デプロイワークフローの安定化

## 優先度
高

## 状態
進行中
"@
    },
    @{
        Title = "開発体制の整備"
        Body = @"
## 説明
AI駆動開発体制（仕様駆動開発）の確立

## サブタスク
- [x] GitHub CLIのセットアップ
- [x] `.kiro/steering/`ディレクトリ構造の作成
- [ ] GitHub Projectとの連携
- [ ] タスクをGitHub Issuesに登録

## 優先度
高

## 状態
進行中
"@
    },
    @{
        Title = "コード品質の向上"
        Body = @"
## 説明
テストの追加とコードレビューの実施

## サブタスク
- [ ] ユニットテストの追加
- [ ] 統合テストの追加
- [ ] コードレビュープロセスの確立

## 優先度
中

## 状態
未着手
"@
    },
    @{
        Title = "モバイルUIの改善"
        Body = @"
## 説明
モバイル環境での使いやすさの向上

## サブタスク
- [x] モバイル用パレットUIの実装
- [x] 長押しドラッグによるノード追加
- [ ] タッチ操作の最適化
- [ ] パフォーマンス改善

## 優先度
中

## 状態
一部完了
"@
    },
    @{
        Title = "バックエンドAPIの実装"
        Body = @"
## 説明
サーバーサイドのAPI実装（現在はローカルストレージのみ）

## 優先度
低

## 状態
未着手
"@
    },
    @{
        Title = "コラボレーション機能"
        Body = @"
## 説明
複数ユーザーでの同時編集機能

## 優先度
低

## 状態
未着手
"@
    },
    @{
        Title = "エクスポート/インポート機能"
        Body = @"
## 説明
タスクマップのエクスポート・インポート機能

## 優先度
低

## 状態
未着手
"@
    }
)

foreach ($issue in $issues) {
    # 既存のIssueをチェック
    $existing = gh issue list --json number,title --jq ".[] | select(.title == `"$($issue.Title)`") | .number" 2>$null
    if ($existing) {
        Write-Host "Skipping existing issue: $($issue.Title) (Issue #$existing)" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Creating issue: $($issue.Title)" -ForegroundColor Green
    $bodyFile = [System.IO.Path]::GetTempFileName()
    $issue.Body | Out-File -FilePath $bodyFile -Encoding UTF8
    
    gh issue create --title $issue.Title --body-file $bodyFile
    
    Remove-Item $bodyFile
    Start-Sleep -Seconds 1
}

Write-Host "`nAll issues created!" -ForegroundColor Green
gh issue list


