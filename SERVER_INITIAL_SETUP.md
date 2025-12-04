# サーバー側の初期設定手順

## 前提条件

- VNCコンソールまたはSSH接続でサーバーにログイン済み
- `root`ユーザーでログインしている

## 手順

### 1. ディレクトリの作成

```bash
mkdir -p /var/www/task.kanazawa-application-support.jp
chown -R root:root /var/www/task.kanazawa-application-support.jp
chmod 755 /var/www/task.kanazawa-application-support.jp
```

### 2. Nginx設定ファイルの作成

既存の`map.kanazawa-application-support.jp`の設定を参考に、新しい設定ファイルを作成します：

```bash
nano /etc/nginx/sites-available/task.kanazawa-application-support.jp
```

以下の内容をコピー＆ペーストしてください：

```nginx
# HTTP → HTTPS リダイレクト
server {
    listen 80;
    listen [::]:80;
    server_name task.kanazawa-application-support.jp;

    # Let's Encryptの証明書取得用
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # HTTPSにリダイレクト（証明書取得後）
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS設定
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name task.kanazawa-application-support.jp;

    # SSL証明書のパス（Let's Encryptを使用する場合）
    ssl_certificate /etc/letsencrypt/live/task.kanazawa-application-support.jp/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/task.kanazawa-application-support.jp/privkey.pem;
    
    # SSL設定
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # ドキュメントルート
    root /var/www/task.kanazawa-application-support.jp;
    index index.html;

    # ログ設定
    access_log /var/log/nginx/task.kanazawa-application-support.jp.access.log;
    error_log /var/log/nginx/task.kanazawa-application-support.jp.error.log;

    # 静的ファイルの配信
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # アセットファイルはキャッシュを許可
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # セキュリティヘッダー
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Gzip圧縮
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;
}
```

**保存方法**: `Ctrl + O` → `Enter` → `Ctrl + X`

### 3. Nginx設定の有効化

```bash
# シンボリックリンクを作成
ln -s /etc/nginx/sites-available/task.kanazawa-application-support.jp /etc/nginx/sites-enabled/

# 設定ファイルの構文チェック
nginx -t

# エラーがなければ、Nginxをリロード
systemctl reload nginx
```

### 4. SSL証明書の取得（Let's Encrypt）

```bash
certbot --nginx -d task.kanazawa-application-support.jp
```

**注意**: 
- 初回実行時は、メールアドレスの入力や利用規約への同意を求められます
- 証明書の取得に成功すると、Nginx設定が自動的に更新されます

### 5. 設定の確認

```bash
# Nginx設定の再確認
nginx -t

# Nginxの状態確認
systemctl status nginx

# ディレクトリの確認
ls -la /var/www/task.kanazawa-application-support.jp
```

## 次のステップ

サーバー側の設定が完了したら、GitHub Actionsでデプロイを実行します：

1. **GitHubリポジトリにコミット＆プッシュ**（`main`ブランチ）
   ```bash
   git add .
   git commit -m "Add deployment configuration"
   git push origin main
   ```

2. **GitHub Actionsの実行を確認**
   - GitHubリポジトリの **「Actions」** タブを開く
   - 最新のワークフロー実行をクリック
   - デプロイが成功するか確認

3. **デプロイ成功後、ブラウザで確認**
   - `https://task.kanazawa-application-support.jp` にアクセス
   - TaskMapアプリケーションが表示されれば成功！

## トラブルシューティング

### Nginx設定エラーが出る場合

```bash
# 設定ファイルの構文チェック
nginx -t

# エラーログを確認
tail -f /var/log/nginx/error.log
```

### SSL証明書の取得に失敗する場合

- DNS設定で `task.kanazawa-application-support.jp` が正しくIPアドレス（`163.44.96.36`）に解決されているか確認
- ポート80と443が開いているか確認

### デプロイが失敗する場合

- GitHub Actionsのログを確認
- サーバーのSSH接続を確認（`ssh -i ~/.ssh/id_ed25519 root@163.44.96.36`）
- ディレクトリの権限を確認（`ls -la /var/www/task.kanazawa-application-support.jp`）

