# TaskMapデプロイトラブルシューティング

## 現在の問題

1. HTTPSが有効になっていない（ブラウザに「セキュリティ保護なし」と表示）
2. まだポスターマッピングシステムが表示されている（TaskMapが表示されない）

## 確認コマンド（サーバー側で実行）

VNCコンソールまたはSSHでサーバーに接続し、以下のコマンドを実行してください：

### 1. SSL証明書の確認

```bash
# SSL証明書の存在確認
docker exec poster-mapping-deploy-frontend-1 ls -la /etc/letsencrypt/live/task.kanazawa-application-support.jp/

# SSL証明書の詳細確認
docker exec poster-mapping-deploy-frontend-1 openssl x509 -in /etc/letsencrypt/live/task.kanazawa-application-support.jp/fullchain.pem -noout -subject -dates
```

### 2. Nginx設定の確認

```bash
# task.kanazawa-application-support.jpの設定を確認
docker exec poster-mapping-deploy-frontend-1 cat /etc/nginx/conf.d/00-task.kanazawa-application-support.jp.conf

# 実際に読み込まれている設定を確認
docker exec poster-mapping-deploy-frontend-1 nginx -T | grep -A 30 "server_name task.kanazawa-application-support.jp"

# rootディレクトリを確認（重要！）
docker exec poster-mapping-deploy-frontend-1 nginx -T 2>&1 | grep -A 20 "server_name task.kanazawa-application-support.jp" | grep -E "root|listen"
```

### 3. 実際に提供されているコンテンツの確認

```bash
# HTTPSで実際のコンテンツを確認（タイトルを確認）
docker exec poster-mapping-deploy-frontend-1 curl -s -k -H "Host: task.kanazawa-application-support.jp" https://localhost/ | grep -i "<title>"

# 完全なHTMLの最初の30行を確認
docker exec poster-mapping-deploy-frontend-1 curl -s -k -H "Host: task.kanazawa-application-support.jp" https://localhost/ | head -30
```

### 4. ファイルの確認

```bash
# TaskMapのindex.htmlが存在するか確認
docker exec poster-mapping-deploy-frontend-1 cat /var/www/task.kanazawa-application-support.jp/index.html | head -10

# ポスターマッピングシステムのファイルが別の場所にないか確認
docker exec poster-mapping-deploy-frontend-1 find /var/www -name "index.html" -type f -exec ls -la {} \;

# 実際に提供されているコンテンツがどこのindex.htmlか確認
docker exec poster-mapping-deploy-frontend-1 curl -s -k -H "Host: task.kanazawa-application-support.jp" https://localhost/ | grep -i "leaflet\|task.*map" | head -5
```

### 5. 問題の特定（重要！）

**ポスターマッピングシステムが表示されている場合：**

```bash
# すべてのNginx設定ファイルを確認
docker exec poster-mapping-deploy-frontend-1 ls -la /etc/nginx/conf.d/

# すべてのserverブロックを確認
docker exec poster-mapping-deploy-frontend-1 nginx -T 2>&1 | grep -B 5 -A 20 "server_name"

# ポスターマッピングシステムのindex.htmlがどこにあるか確認
docker exec poster-mapping-deploy-frontend-1 find /var/www -name "index.html" -exec grep -l "leaflet\|選挙ポスター" {} \;
```

## よくある問題と解決方法

### 問題1: SSL証明書が存在しない、または期限切れ

**解決方法:**
```bash
# 証明書を再取得
certbot certonly --webroot -w /opt/poster-mapping-deploy/certbot/www -d task.kanazawa-application-support.jp

# コンテナ内のNginxをリロード
docker exec poster-mapping-deploy-frontend-1 nginx -s reload
```

### 問題2: Nginxが別のディレクトリを参照している

**確認:**
```bash
# Nginx設定でrootディレクトリを確認
docker exec poster-mapping-deploy-frontend-1 nginx -T | grep -A 5 "server_name task.kanazawa-application-support.jp" | grep root
```

**解決方法:**
`/etc/nginx/conf.d/00-task.kanazawa-application-support.jp.conf`の`root`ディレクトリが`/var/www/task.kanazawa-application-support.jp`になっているか確認してください。

### 問題3: default.confがまだ有効になっている

**確認:**
```bash
docker exec poster-mapping-deploy-frontend-1 ls -la /etc/nginx/conf.d/ | grep default
```

**解決方法:**
```bash
# default.confを無効化
docker exec poster-mapping-deploy-frontend-1 mv /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf.disabled
docker exec poster-mapping-deploy-frontend-1 nginx -s reload
```

### 問題4: ブラウザのキャッシュ

ブラウザのキャッシュをクリアしてください：
- `Ctrl + Shift + Delete`でキャッシュをクリア
- またはシークレットモードでアクセス
- または`Ctrl + F5`で強制リロード

## 次のステップ

1. 上記のコマンドを実行して結果を確認
2. 問題が特定できたら、適切な解決方法を実行
3. まだ解決しない場合は、実行結果を共有してください





