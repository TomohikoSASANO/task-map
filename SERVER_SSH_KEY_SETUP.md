# サーバーへの公開鍵登録手順

## 公開鍵の内容

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQR3lCbhG/okee/qgXt7LvzsD1gYcSuzuXZKa1A+qAI mokoh@TomohikoSASANO
```

## 重要：サーバーに接続してから実行

**`chmod`コマンドはLinux/Unixのコマンドです。Windows PowerShellでは使えません。**

以下のコマンドは、**サーバーにSSH接続した後**に実行してください。

## 手順

### 1. サーバーにSSH接続

**まず、PowerShellでサーバーに接続します：**

```powershell
# サーバーのIPアドレスまたはドメイン名を使用
ssh DEPLOY_USER@DEPLOY_HOST

# 例: 
# ssh ubuntu@kanazawa-application-support.jp
# または
# ssh ubuntu@123.456.789.012
```

**注意**: 
- 初回接続時は、ホストのフィンガープリント確認を求められる場合があります。`yes`と入力してEnterキーを押してください。
- 接続後、プロンプトが `user@server:~$` のように変わり、サーバー側のコマンドが実行できるようになります。

### 2. サーバー側で.sshディレクトリを作成（存在しない場合）

**サーバーに接続した後**（プロンプトが `user@server:~$` になっている状態）、以下のコマンドを実行：

```bash
# .sshディレクトリが存在しない場合は作成
mkdir -p ~/.ssh

# ディレクトリの権限を設定（重要）
# このコマンドはサーバー側で実行します（Linux/Unix環境）
chmod 700 ~/.ssh
```

**確認**: プロンプトが `PS C:\Users\mokoh>` のままの場合は、まだローカルPCです。サーバーに接続できているか確認してください。

### 3. authorized_keysファイルに公開鍵を追加

**サーバーに接続した状態で**、以下のコマンドを実行：

```bash
# 公開鍵を追加（既存の内容を保持）
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQR3lCbhG/okee/qgXt7LvzsD1gYcSuzuXZKa1A+qAI mokoh@TomohikoSASANO" >> ~/.ssh/authorized_keys

# ファイルの権限を設定（重要）
# このコマンドもサーバー側で実行します
chmod 600 ~/.ssh/authorized_keys
```

**注意**: PowerShellのプロンプト（`PS C:\Users\mokoh>`）で実行するとエラーになります。必ずサーバーに接続してから実行してください。

### 4. 確認

追加されたことを確認：

```bash
# authorized_keysファイルの内容を表示
cat ~/.ssh/authorized_keys

# ファイルの権限を確認
ls -la ~/.ssh/
```

以下のように表示されれば成功です：

```
-rw------- 1 user user 123 Jan 1 12:00 authorized_keys
drwx------ 2 user user 4096 Jan 1 12:00 .
```

### 5. 接続テスト

サーバーからログアウトして、新しい鍵で接続できるかテスト：

```bash
# サーバーからログアウト
exit
```

ローカルPC（PowerShell）で：

```powershell
# 作成した鍵でサーバーに接続できるかテスト
ssh -i ~/.ssh/Takafumi0812! DEPLOY_USER@DEPLOY_HOST
# または、デフォルト名の場合
ssh -i ~/.ssh/id_ed25519 DEPLOY_USER@DEPLOY_HOST
```

パスワードを聞かれずに接続できれば成功です！

## トラブルシューティング

### 権限エラーが出る場合

```bash
# 権限を再設定
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 接続できない場合

1. **公開鍵が正しく追加されているか確認**
   ```bash
   cat ~/.ssh/authorized_keys
   ```

2. **SSH設定を確認**
   ```bash
   sudo nano /etc/ssh/sshd_config
   ```
   以下の設定が有効になっているか確認：
   - `PubkeyAuthentication yes`
   - `AuthorizedKeysFile .ssh/authorized_keys`

3. **SSHサービスを再起動**（必要に応じて）
   ```bash
   sudo systemctl restart sshd
   ```

## まとめコマンド（一括実行）

サーバーに接続後、以下のコマンドを順番に実行：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQR3lCbhG/okee/qgXt7LvzsD1gYcSuzuXZKa1A+qAI mokoh@TomohikoSASANO" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys
```



