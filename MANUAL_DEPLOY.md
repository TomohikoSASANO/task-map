# 手動デプロイ手順

## 現在の状況

GitHub Actionsでデプロイが自動実行されない場合、以下の手順で手動でデプロイを実行できます。

## 方法1: 空のコミットでデプロイをトリガー

```powershell
cd c:\Users\mokoh\task-map

# 空のコミットを作成してプッシュ（デプロイワークフローをトリガー）
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

## 方法2: ファイルを少し変更してコミット

```powershell
cd c:\Users\mokoh\task-map

# 小さな変更を加える（例：READMEにコメントを追加）
echo "# TaskMap" > README.md
git add README.md
git commit -m "Trigger deployment"
git push origin main
```

## 方法3: GitHub Actionsのワークフローを手動実行

1. GitHubのリポジトリページを開く
2. 「Actions」タブをクリック
3. 左側の「Deploy」ワークフローを選択
4. 「Run workflow」ボタンをクリック
5. ブランチを選択（`main`）して「Run workflow」をクリック

## デプロイの確認

デプロイが開始されたら：
1. GitHub Actionsのページで進行状況を確認
2. デプロイが完了したら、https://task.kanazawa-application-support.jp/ にアクセス
3. **ブラウザのキャッシュをクリア**（重要！）
   - `Ctrl + Shift + Delete`
   - またはシークレットモードでアクセス

## トラブルシューティング

### デプロイが開始されない場合

1. **GitHub Secretsの確認**
   - `DEPLOY_HOST`
   - `DEPLOY_USER`
   - `DEPLOY_SSH_KEY`
   - `DEPLOY_PORT`

2. **ワークフローファイルの確認**
   - `.github/workflows/deploy.yml`が正しく存在するか
   - `on: push: branches: - main`が設定されているか

3. **GitHub Actionsが有効になっているか確認**
   - リポジトリのSettings > Actions > General
   - 「Allow all actions and reusable workflows」が選択されているか確認


