# クイックスタート：サーバーへの公開鍵追加

## 問題

PowerShellで`chmod`コマンドを実行するとエラーが出ます。これは、`chmod`がLinux/Unixのコマンドで、Windows PowerShellでは使えないためです。

## 解決方法

**サーバーにSSH接続してから、サーバー側でコマンドを実行してください。**

## 手順（簡易版）

### ステップ1: サーバーに接続

PowerShellで、**実際のユーザー名とサーバーアドレスを指定**して接続：

```powershell
# DEPLOY_USERとDEPLOY_HOSTは実際の値に置き換えてください
ssh ユーザー名@サーバーのIPアドレスまたはドメイン名
```

**実際の例**（既存のポスターマッピングシステムと同じサーバーの場合）：
```powershell
# 例1: ドメイン名を使用
ssh ubuntu@kanazawa-application-support.jp

# 例2: IPアドレスを使用
ssh ubuntu@123.456.789.012

# 例3: ユーザー名が異なる場合
ssh deploy@kanazawa-application-support.jp
```

**重要**: `DEPLOY_USER@DEPLOY_HOST` のままでは接続できません。実際の値に置き換えてください。

**接続成功の確認**: プロンプトが以下のように変わります：
- 接続前: `PS C:\Users\mokoh>`
- 接続後: `user@server:~$` または `[user@server ~]$`

### ステップ2: サーバー側でコマンドを実行

**プロンプトが `user@server:~$` になっていることを確認してから**、以下を実行：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQR3lCbhG/okee/qgXt7LvzsD1gYcSuzuXZKa1A+qAI mokoh@TomohikoSASANO" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys
```

### ステップ3: 確認

`cat`コマンドの出力に公開鍵が表示されれば成功です。

### ステップ4: サーバーからログアウト

```bash
exit
```

### ステップ5: 接続テスト

ローカルPC（PowerShell）で：

```powershell
ssh -i ~/.ssh/Takafumi0812! DEPLOY_USER@DEPLOY_HOST
```

パスワードを聞かれずに接続できれば成功です！

## よくある間違い

❌ **間違い**: PowerShellのプロンプト（`PS C:\Users\mokoh>`）で`chmod`を実行
✅ **正しい**: サーバーに接続後（`user@server:~$`）で`chmod`を実行

## 確認方法

- **ローカルPC**: プロンプトが `PS C:\Users\mokoh>` の形式
- **サーバー**: プロンプトが `user@server:~$` または `[user@server ~]$` の形式



