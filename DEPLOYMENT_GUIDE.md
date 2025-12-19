# TaskMap デプロイガイド

## デプロイの流れ

## 最終的に動いている構成（2025-12-19時点）

- `task.kanazawa-application-support.jp` は **既存のDockerコンテナ** `poster-mapping-deploy-frontend-*` のNginxで配信
- デプロイは GitHub Actions（`.github/workflows/deploy.yml`）で実行
  - `dist/**` をサーバー（ホスト）へ転送 → その後コンテナ内 `/var/www/task.kanazawa-application-support.jp/` へコピー
  - Nginx vhost をコンテナ内 `/etc/nginx/conf.d/00-task.kanazawa-application-support.jp.conf` にコピー
  - `nginx -t` → `nginx -s reload`
  - Let’s Encrypt 証明書がなければ発行（certbotをNginxコンテナと同じvolumeに対して実行）

## 重要な落とし穴（ここで何度も詰まった）

- **SCPの転送元**:
  - `dist/*` だと `assets/` などネストしたファイルが転送されず壊れる
  - 正: `dist/**`
- **scp-action の target**:
  - `target` は「ディレクトリ」指定。ファイルパス（例 `/tmp/nginx-task.conf`）を指定すると失敗する
  - 正: `target: /tmp` へ置いてから `docker cp /tmp/nginx-task.conf ...` でコンテナへコピー
- **Nginxの include 位置**:
  - 一部イメージ/設定では `conf.d` を別コンテキストで読んでしまい `server directive is not allowed here` が出る
  - そのため今は **コンテナ内の `nginx.conf` を壊れた状態から自動修復**する処理をワークフローに入れている
- **HTTPS（証明書）**:
  - 証明書は「Nginxコンテナが実際に参照している `/etc/letsencrypt`」に入っていないと意味がない
  - そのため certbot は **Nginxコンテナと同じマウント先（volume）**に対して実行する

### 1. 現在のブランチ確認

```powershell
cd c:\Users\mokoh\task-map
git branch
git status
```

### 2. mainブランチに切り替え・マージ

作業ブランチからmainブランチに切り替えてマージします：

```powershell
# mainブランチに切り替え
git checkout main

# 最新の状態を取得
git pull origin main

# 作業ブランチ（例: feature/mobile-ui-longpress）をマージ
git merge feature/mobile-ui-longpress

# または、特定のブランチをマージする場合
# git merge <ブランチ名>
```

### 3. ビルドとテストの確認

```powershell
# 依存関係のインストール
npm ci

# テストの実行
npm run test:ci

# ビルドの確認
npm run build
```

### 4. コミットとプッシュ

```powershell
# 変更があればコミット
git add .
git commit -m "Deploy TaskMap to production"

# mainブランチにプッシュ（これで自動デプロイが開始されます）
git push origin main
```

### 5. デプロイの確認

GitHub Actionsでデプロイの進行状況を確認：
- https://github.com/TomohikoSASANO/task-map/actions

デプロイが完了したら、以下にアクセスして確認：
- https://task.kanazawa-application-support.jp/

## デプロイワークフローの内容

`.github/workflows/deploy.yml`が以下の処理を自動実行します：

1. **コードチェックアウト**: GitHubから最新のコードを取得
2. **依存関係のインストール**: `npm ci`で依存関係をインストール
3. **テスト実行**: `npm run test:ci`でテストを実行
4. **ビルド**: `npm run build`でプロダクションビルドを作成
5. **ファイル転送**: SCPでサーバーにファイルを転送
6. **Dockerコンテナへのコピー**: ファイルをDockerコンテナ内にコピー
7. **Nginx設定の確認・修正**: Nginx設定を確認し、必要に応じて修正
8. **Nginxリロード**: 設定を反映

## トラブルシューティング

### デプロイが失敗する場合

1. **GitHub Secretsの確認**
   - `DEPLOY_HOST`: サーバーのIPアドレス
   - `DEPLOY_USER`: SSHユーザー名（通常は`root`）
   - `DEPLOY_SSH_KEY`: SSH秘密鍵
   - `DEPLOY_PORT`: SSHポート（通常は`22`）

2. **サーバー側の確認**
   - `/var/www/task.kanazawa-application-support.jp/`ディレクトリが存在するか
   - Dockerコンテナ`poster-mapping-deploy-frontend-1`が実行中か
   - Nginx設定ファイルが正しいか

3. **詳細なログ確認**
   - GitHub Actionsのログを確認
   - `TROUBLESHOOTING.md`を参照

### サイトが表示されない場合

1. **ブラウザのキャッシュをクリア**
   - `Ctrl + Shift + Delete`でキャッシュをクリア
   - またはシークレットモードでアクセス

2. **SSL証明書の確認**
   ```bash
   docker exec poster-mapping-deploy-frontend-1 ls -la /etc/letsencrypt/live/task.kanazawa-application-support.jp/
   ```

3. **Nginx設定の確認**
   ```bash
   docker exec poster-mapping-deploy-frontend-1 nginx -t
   docker exec poster-mapping-deploy-frontend-1 nginx -s reload
   ```

## 次のステップ

デプロイが成功したら：
1. サイトにアクセスして動作確認
2. チームメンバーにURLを共有
3. フィードバックを収集して改善


