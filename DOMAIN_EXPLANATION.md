# ドメイン名の使い分け

## 重要な違い

### SSH接続用
- **使用するドメイン**: `kanazawa-application-support.jp`（親ドメイン）
- **または**: サーバーのIPアドレス
- **用途**: サーバーへのSSH接続、ファイルのアップロードなど

### Webサイト用
- **使用するドメイン**: `task.kanazawa-application-support.jp`（サブドメイン）
- **用途**: ブラウザでアクセスするURL、Nginx設定で使用

## 説明

- **`kanazawa-application-support.jp`**: サーバー自体のドメイン名（SSH接続に使用）
- **`task.kanazawa-application-support.jp`**: このアプリケーション専用のサブドメイン（Webアクセス用）

サブドメイン（`task.`）は、NginxなどのWebサーバーの設定で使用され、SSH接続には通常使用しません。

## 実際の使い方

### 1. SSH接続（サーバーへの接続）

```powershell
# 親ドメインまたはIPアドレスを使用
ssh ubuntu@kanazawa-application-support.jp
# または
ssh ubuntu@サーバーのIPアドレス
```

### 2. GitHub Secrets設定

GitHubリポジトリの Settings > Secrets で設定：

- **DEPLOY_HOST**: `kanazawa-application-support.jp`（SSH接続用）
- **DEPLOY_USER**: `ubuntu` など（SSH接続用のユーザー名）

### 3. Nginx設定

サーバー側のNginx設定ファイルで：

```nginx
server {
    server_name task.kanazawa-application-support.jp;  # ← サブドメインを使用
    # ...
}
```

### 4. ブラウザでのアクセス

ユーザーがブラウザでアクセスするURL：

```
https://task.kanazawa-application-support.jp
```

## まとめ

| 用途 | 使用するドメイン |
|------|----------------|
| SSH接続 | `kanazawa-application-support.jp` または IPアドレス |
| GitHub Secrets (DEPLOY_HOST) | `kanazawa-application-support.jp` または IPアドレス |
| Nginx設定 (server_name) | `task.kanazawa-application-support.jp` |
| ブラウザでのアクセス | `task.kanazawa-application-support.jp` |

**結論**: SSH接続やGitHub Secretsでは `kanazawa-application-support.jp` を使用し、WebサイトのURLやNginx設定では `task.kanazawa-application-support.jp` を使用します。



