# SSH接続情報（実際の値）

## サーバー情報

- **IPアドレス**: `163.44.96.36`
- **ユーザー名**: `root`
- **パスワード**: `Takafumi0812!`
- **SSHポート**: `22`

## PowerShellからのSSH接続

### 1. パスワード認証で接続（初回）

```powershell
ssh root@163.44.96.36
```

パスワードを聞かれたら、`Takafumi0812!` を入力してください。

### 2. 公開鍵認証で接続（公開鍵追加後）

公開鍵を追加した後は、以下のコマンドでパスワードなしで接続できます：

```powershell
ssh -i ~/.ssh/Takafumi0812! root@163.44.96.36
```

## GitHub Secretsの設定値

GitHubリポジトリの Settings > Secrets and variables > Actions で以下を設定：

- **DEPLOY_HOST**: `163.44.96.36`
- **DEPLOY_USER**: `root`
- **DEPLOY_SSH_KEY**: ローカルPCの `~/.ssh/Takafumi0812!` ファイルの内容（秘密鍵）
- **DEPLOY_PORT**: `22`（オプション）

## 公開鍵の内容

サーバーの `~/.ssh/authorized_keys` に追加する公開鍵：

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQR3lCbhG/okee/qgXt7LvzsD1gYcSuzuXZKa1A+qAI mokoh@TomohikoSASANO
```

## 接続テスト

公開鍵を追加した後、以下のコマンドで接続テスト：

```powershell
# 公開鍵で接続（パスワード不要）
ssh -i ~/.ssh/Takafumi0812! root@163.44.96.36

# 接続成功の確認
# プロンプトが root@server:~# に変わる
```

