# SSH接続ガイド

## エラー: "Could not resolve hostname deploy_host"

このエラーは、`DEPLOY_USER@DEPLOY_HOST`がプレースホルダーのままで、実際の値に置き換えられていないために発生します。

## 解決方法

### 1. サーバー情報を確認

既存のポスターマッピングシステム（`map.kanazawa-application-support.jp`）と同じサーバーを使用している場合、以下の情報が必要です：

- **ユーザー名**: サーバーにSSH接続する際に使用するユーザー名
  - 例: `ubuntu`, `deploy`, `root` など
- **サーバーアドレス**: サーバーのIPアドレスまたはドメイン名
  - 例: `kanazawa-application-support.jp` または `123.456.789.012`

### 2. 正しいSSH接続コマンド

**重要**: 
- ConoHa VPSサーバーの場合、**IPアドレスを直接指定**する方が確実です
- ドメイン名（`kanazawa-application-support.jp`）は、DNS設定でIPアドレスに解決される必要があります

PowerShellで、以下のように**実際の値に置き換えて**実行：

```powershell
# 形式
ssh ユーザー名@サーバーアドレス

# ConoHa VPSサーバーの場合（推奨）: IPアドレスを直接指定
ssh root@123.456.789.012
# または
ssh vpsadmin@123.456.789.012

# ドメイン名を使用する場合（DNS設定が必要）
ssh ubuntu@kanazawa-application-support.jp
```

**ConoHa VPSサーバーの場合**:
- ConoHaのコントロールパネルで確認した**IPアドレス**を使用
- ユーザー名は通常 `root` または `vpsadmin`
- パスワード認証で接続できる場合、パスワードを入力して接続

### 3. サーバー情報がわからない場合

既存のポスターマッピングシステムのデプロイ設定を確認：

1. **サーバー管理画面やドキュメントを確認**
2. **既存のSSH接続方法を確認**
3. **サーバー管理者に問い合わせ**

### 4. 接続テスト

正しいコマンドで接続できるか確認：

```powershell
# 例: ubuntuユーザーで接続する場合
ssh ubuntu@kanazawa-application-support.jp
```

**接続成功の確認**:
- パスワードを聞かれる、または
- プロンプトが `user@server:~$` に変わる

### 5. 接続後の作業

接続が成功したら、プロンプトが `user@server:~$` に変わります。
その後、以下のコマンドを実行：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQR3lCbhG/okee/qgXt7LvzsD1gYcSuzuXZKa1A+qAI mokoh@TomohikoSASANO" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys
```

## エラー: "Connection timed out"

このエラーは、ホスト名の解決はできているが、SSH接続がタイムアウトしていることを示します。

### 考えられる原因と対処法

1. **サーバーがダウンしている**
   - サーバーの状態を確認してください

2. **SSHポートが22以外に設定されている**
   ```powershell
   # ポート番号を指定して接続を試す
   ssh -p 2222 ubuntu@kanazawa-application-support.jp
   # または
   ssh -p 22022 ubuntu@kanazawa-application-support.jp
   ```

3. **ファイアウォールでSSHポートがブロックされている**
   - サーバー側のファイアウォール設定を確認

4. **IPアドレスを直接指定する**
   ```powershell
   # ドメイン名ではなく、IPアドレスを直接指定
   ssh ubuntu@123.456.789.012
   ```

5. **既存の接続方法を確認**
   - 既存のポスターマッピングシステム（`map.kanazawa-application-support.jp`）への接続方法を確認
   - 同じサーバーなら、同じ方法で接続できるはずです

## よくある質問

### Q: ユーザー名がわからない

A: 一般的には以下のいずれかです：
- `ubuntu` (Ubuntuサーバーの場合)
- `deploy` (デプロイ専用ユーザーの場合)
- `root` (ルートユーザーの場合、非推奨)

### Q: サーバーアドレスがわからない

A: 既存のポスターマッピングシステムと同じサーバーなら：
- ドメイン: `kanazawa-application-support.jp`
- または、サーバーのIPアドレス

### Q: パスワードを聞かれる

A: 正常です。パスワードを入力して接続してください。
公開鍵を追加後は、パスワードなしで接続できるようになります。

### Q: Connection timed out エラーが出る

A: 以下を試してください：
1. サーバーのIPアドレスを直接指定
2. 別のSSHポートを試す（`-p`オプション）
3. 既存のポスターマッピングシステムへの接続方法を確認
4. サーバーの状態を確認



