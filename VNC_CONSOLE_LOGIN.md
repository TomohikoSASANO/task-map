# VNCコンソールでのログイン方法

## 現在の状態確認

VNCコンソールを開いたとき、以下のいずれかの状態になっています：

### 1. 既にログイン済みの場合

プロンプトが以下のような形式になっている場合：
- `root@server:~#`
- `root@server:~$`
- `[root@server ~]#`

**→ そのままコマンドを実行できます！**

### 2. ログインが必要な場合

プロンプトが以下のような形式になっている場合：
- `login:`
- `Password:`
- または何も表示されていない

**→ ログインが必要です**

## ログイン手順

1. **ユーザー名を入力**: `root`
2. **Enterキーを押す**
3. **パスワードを入力**: `Takafumi0812!`
   - **注意**: パスワードは画面に表示されませんが、正常です
4. **Enterキーを押す**

ログインが成功すると、プロンプトが `root@...` の形式に変わります。

## ログイン後の作業

ログイン後、以下のコマンドを実行して公開鍵を追加してください：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQR3lCbhG/okee/qgXt7LvzsD1gYcSuzuXZKa1A+qAI mokoh@TomohikoSASANO" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys
```

最後の `cat` コマンドで、追加した公開鍵が表示されれば成功です。

## 次のステップ

公開鍵の追加が完了したら：

1. **GitHub Secretsを設定**（`GITHUB_SECRETS_SETUP.md` を参照）
   - `DEPLOY_HOST`: `163.44.96.36`
   - `DEPLOY_USER`: `root`
   - `DEPLOY_SSH_KEY`: ローカルPCの `~/.ssh/Takafumi0812!` ファイルの内容
   - `DEPLOY_PORT`: `22`

2. **SSH接続をテスト**（PowerShellで）
   ```powershell
   ssh -i ~/.ssh/Takafumi0812! root@163.44.96.36
   ```
   パスワードを聞かれずに接続できれば成功です！

