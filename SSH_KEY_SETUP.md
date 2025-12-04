# SSH鍵の作成と設定手順（Windows）

SSH鍵が存在しない場合の作成手順です。

## 1. SSH鍵の作成

PowerShellで以下のコマンドを実行：

```powershell
ssh-keygen -t ed25519 -C "your_email@example.com"
```

**実行時の質問：**

1. **ファイルの保存場所**
   - デフォルト（`C:\Users\mokoh\.ssh\id_ed25519`）でOKなら、そのままEnterキーを押す

2. **パスフレーズの設定**
   - GitHub Actionsで使用する場合は、**空（Enterキーを2回）**でOK
   - セキュリティを重視する場合は、パスフレーズを設定可能（ただし、GitHub Actionsで使用する際は追加設定が必要）

## 2. 作成された鍵の確認

```powershell
# .sshディレクトリの内容を確認
Get-ChildItem ~/.ssh

# 秘密鍵の内容を表示（GitHub Secretsにコピーするため）
Get-Content ~/.ssh/id_ed25519
```

## 3. 公開鍵の確認（サーバーに登録するため）

```powershell
# 公開鍵の内容を表示
Get-Content ~/.ssh/id_ed25519.pub
```

この公開鍵をサーバーの `~/.ssh/authorized_keys` に追加する必要があります。

## 4. サーバーへの公開鍵の登録

### 方法1: サーバーにSSH接続して手動で追加

```powershell
# サーバーに接続（パスワード認証で接続できる場合）
ssh DEPLOY_USER@DEPLOY_HOST

# サーバー側で実行
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "公開鍵の内容" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 方法2: ssh-copy-idコマンドを使用（Windowsでは利用できない場合あり）

```powershell
# Windowsでは利用できない場合があるので、方法1を推奨
```

## 5. GitHub Secretsへの設定

1. 秘密鍵の内容をコピー：
   ```powershell
   Get-Content ~/.ssh/id_ed25519 | Set-Clipboard
   ```
   これでクリップボードにコピーされます

2. GitHubリポジトリの Settings > Secrets and variables > Actions で：
   - **Name**: `DEPLOY_SSH_KEY`
   - **Secret**: クリップボードの内容を貼り付け（`-----BEGIN OPENSSH PRIVATE KEY-----` から `-----END OPENSSH PRIVATE KEY-----` まで全て）

## 6. 接続テスト

```powershell
# サーバーへの接続をテスト
ssh -i ~/.ssh/id_ed25519 DEPLOY_USER@DEPLOY_HOST
```

これが成功すれば、GitHub Actionsでも動作します。

## トラブルシューティング

### 鍵が作成されない場合

- PowerShellの実行ポリシーを確認：
  ```powershell
  Get-ExecutionPolicy
  ```
- 必要に応じて変更：
  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

### 既存の鍵を使用したい場合

既にサーバーに接続できるSSH鍵がある場合は、その鍵を使用できます：

```powershell
# 既存の鍵を確認
Get-ChildItem ~/.ssh

# 既存の鍵の内容を表示
Get-Content ~/.ssh/既存の鍵ファイル名
```



