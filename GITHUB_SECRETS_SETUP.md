# GitHub Secrets設定手順

GitHub Secretsは、GitHubリポジトリのWebインターフェースで設定します。コードを変更する必要はありません。

## 設定手順

### 1. GitHubリポジトリにアクセス

1. ブラウザでGitHubにログイン
2. Task Mapのリポジトリ（`task-map`）を開く

### 2. Settingsページに移動

1. リポジトリページの上部タブから **「Settings」** をクリック
2. 左サイドバーの **「Secrets and variables」** → **「Actions」** をクリック

### 3. Secretsを追加

**「New repository secret」** ボタンをクリックして、以下の4つのSecretsを追加します：

#### ① DEPLOY_HOST

- **Name**: `DEPLOY_HOST`
- **Secret**: サーバーの**IPアドレス**（推奨）または親ドメイン名（SSH接続用）
  - **ConoHa VPSサーバーの場合**: ConoHaのコントロールパネルで確認した**IPアドレス**を使用（例: `123.456.789.012`）
  - ドメイン名を使用する場合: `kanazawa-application-support.jp`
  - **注意**: `task.kanazawa-application-support.jp`（サブドメイン）は使用しない。SSH接続にはIPアドレスまたは親ドメインを使用

#### ② DEPLOY_USER

- **Name**: `DEPLOY_USER`
- **Secret**: SSH接続用のユーザー名
  - **ConoHa VPSサーバーの場合**: 通常は `root` または `vpsadmin`（ConoHaのコントロールパネルで確認）
  - その他の場合: `ubuntu` または `deploy` など、サーバーにSSH接続する際に使用するユーザー名

#### ③ DEPLOY_SSH_KEY

- **Name**: `DEPLOY_SSH_KEY`
- **Secret**: SSH秘密鍵の内容（全体をコピー）
  - ローカルPCの `~/.ssh/id_rsa` または `~/.ssh/id_ed25519` などのファイルの内容
  - カスタム名で作成した場合は、そのファイル名（例: `~/.ssh/Takafumi0812!`）
  - ファイルを開いて、`-----BEGIN OPENSSH PRIVATE KEY-----` から `-----END OPENSSH PRIVATE KEY-----` まで全てコピー

**SSH鍵の確認方法（Windows PowerShell）:**
```powershell
# まず、.sshディレクトリと既存の鍵を確認
if (Test-Path ~/.ssh) {
    Get-ChildItem ~/.ssh
} else {
    Write-Host ".sshディレクトリが存在しません。新規作成が必要です。"
}

# 既存のSSH鍵を確認（存在する場合）
if (Test-Path ~/.ssh/id_rsa) {
    Get-Content ~/.ssh/id_rsa
} elseif (Test-Path ~/.ssh/id_ed25519) {
    Get-Content ~/.ssh/id_ed25519
} else {
    Write-Host "SSH鍵が見つかりません。新規作成が必要です。"
}

# 鍵がない場合は新規作成
# 以下のコマンドを実行すると、対話形式で鍵を作成できます
ssh-keygen -t ed25519 -C "your_email@example.com"

# 作成後、パスフレーズを設定するか聞かれますが、GitHub Actionsで使用する場合は空（Enterキー）でOKです
# ただし、セキュリティ上の理由からパスフレーズを設定することを推奨します
```

**SSH鍵の確認方法（Linux/Mac）:**
```bash
# 既存のSSH鍵を確認
cat ~/.ssh/id_rsa
# または
cat ~/.ssh/id_ed25519

# 鍵がない場合は新規作成
ssh-keygen -t ed25519 -C "your_email@example.com"
```

**重要**: 
- 秘密鍵（`id_rsa` や `id_ed25519`）をコピーしてください。公開鍵（`.pub`ファイル）ではありません
- この秘密鍵に対応する公開鍵がサーバーの `~/.ssh/authorized_keys` に登録されている必要があります

#### ④ DEPLOY_PORT（オプション）

- **Name**: `DEPLOY_PORT`
- **Secret**: SSHポート番号
  - デフォルトは `22`
  - カスタムポートを使用している場合のみ設定

### 4. 設定の確認

設定後、以下のように4つのSecretsが表示されていることを確認してください：

- ✅ DEPLOY_HOST
- ✅ DEPLOY_USER
- ✅ DEPLOY_SSH_KEY
- ✅ DEPLOY_PORT（オプション）

## サーバー側のSSH鍵設定確認

GitHub Actionsからサーバーに接続できるように、サーバー側で公開鍵が登録されていることを確認してください。

### サーバーにSSH接続して確認

```bash
# サーバーにSSH接続
ssh DEPLOY_USER@DEPLOY_HOST

# サーバー側で公開鍵が登録されているか確認
cat ~/.ssh/authorized_keys
```

### 公開鍵が登録されていない場合

ローカルPCで公開鍵を表示：
```bash
# Windows PowerShell
cat ~/.ssh/id_rsa.pub
# または
cat ~/.ssh/id_ed25519.pub

# Linux/Mac
cat ~/.ssh/id_rsa.pub
# または
cat ~/.ssh/id_ed25519.pub
```

表示された公開鍵をサーバーの `~/.ssh/authorized_keys` に追加：
```bash
# サーバー側で実行
echo "公開鍵の内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 設定後のテスト

Secretsを設定したら、`main`ブランチにプッシュしてデプロイが動作するか確認：

```bash
git add .
git commit -m "Add deployment configuration"
git push origin main
```

GitHub Actionsのログでデプロイの成功/失敗を確認できます：
- リポジトリページ → **「Actions」** タブ → 最新のワークフロー実行をクリック

## トラブルシューティング

### SSH接続エラーが出る場合

1. **SSH鍵の形式を確認**
   - `DEPLOY_SSH_KEY`に秘密鍵全体が正しくコピーされているか確認
   - 改行や余分なスペースがないか確認

2. **サーバー側の公開鍵を確認**
   - サーバーの `~/.ssh/authorized_keys` に対応する公開鍵が登録されているか確認

3. **SSH接続を手動でテスト**
   ```bash
   ssh -i ~/.ssh/id_rsa DEPLOY_USER@DEPLOY_HOST
   ```
   これが成功すれば、GitHub Actionsでも動作するはずです

### 権限エラーが出る場合

- サーバー側のディレクトリ権限を確認：
  ```bash
  ls -la /var/www/task.kanazawa-application-support.jp
  sudo chown -R DEPLOY_USER:DEPLOY_USER /var/www/task.kanazawa-application-support.jp
  ```



