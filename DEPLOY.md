# デプロイ手順

## 前提条件

1. サーバーにSSHアクセス可能
2. Nginxがインストール済み
3. GitHub ActionsのSecretsが設定済み

## GitHub Secretsの設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下を設定：

- `DEPLOY_HOST`: サーバーのIPアドレスまたはドメイン
- `DEPLOY_USER`: SSH接続用のユーザー名
- `DEPLOY_SSH_KEY`: SSH秘密鍵（サーバーへのアクセス権限があるもの）
- `DEPLOY_PORT`: SSHポート（デフォルト: 22）

**詳細な設定手順は [GITHUB_SECRETS_SETUP.md](./GITHUB_SECRETS_SETUP.md) を参照してください。**

## サーバー側の初期設定

### 1. ディレクトリの作成

```bash
sudo mkdir -p /var/www/task.kanazawa-application-support.jp
sudo chown -R $USER:$USER /var/www/task.kanazawa-application-support.jp
```

### 2. Nginx設定ファイルの作成

```bash
sudo nano /etc/nginx/sites-available/task.kanazawa-application-support.jp
```

`nginx.conf.example`の内容をコピーして設定

### 3. Nginx設定の有効化

```bash
sudo ln -s /etc/nginx/sites-available/task.kanazawa-application-support.jp /etc/nginx/sites-enabled/
sudo nginx -t  # 設定ファイルの構文チェック
sudo systemctl reload nginx
```

### 4. SSL証明書の取得（Let's Encrypt）

```bash
sudo certbot --nginx -d task.kanazawa-application-support.jp
```

### 5. 初回デプロイ

`main`ブランチにプッシュすると、GitHub Actionsが自動的にビルドしてデプロイします。

```bash
git push origin main
```

## 手動デプロイ（必要な場合）

```bash
# ローカルでビルド
npm run build

# サーバーにアップロード
scp -r dist/* user@server:/var/www/task.kanazawa-application-support.jp/
```

## トラブルシューティング

### デプロイが失敗する場合

1. GitHub Actionsのログを確認
2. サーバーのSSH接続を確認
3. ディレクトリの権限を確認

### Nginxエラーが出る場合

```bash
sudo nginx -t  # 設定ファイルの構文チェック
sudo tail -f /var/log/nginx/task.kanazawa-application-support.jp.error.log  # エラーログ確認
```

### ページが表示されない場合

1. Nginxの設定を確認
2. ファイルの権限を確認
3. ファイアウォールの設定を確認
