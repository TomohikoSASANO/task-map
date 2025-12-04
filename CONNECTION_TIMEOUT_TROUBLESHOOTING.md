# SSH接続タイムアウトの対処法

## エラー: "Connection timed out"

`ssh ubuntu@kanazawa-application-support.jp` を実行した際に "Connection timed out" エラーが出る場合の対処法です。

## 対処法

### 1. 既存の接続方法を確認

既存のポスターマッピングシステム（`map.kanazawa-application-support.jp`）への接続方法を確認してください。同じサーバーなら、同じ方法で接続できるはずです。

### 2. IPアドレスを直接指定

ドメイン名ではなく、サーバーのIPアドレスを直接指定してみてください：

```powershell
# IPアドレスを直接指定（例）
ssh ubuntu@123.456.789.012
```

### 3. 別のSSHポートを試す

SSHポートが22以外に設定されている可能性があります：

```powershell
# ポート2222を試す
ssh -p 2222 ubuntu@kanazawa-application-support.jp

# ポート22022を試す
ssh -p 22022 ubuntu@kanazawa-application-support.jp

# ポート10022を試す
ssh -p 10022 ubuntu@kanazawa-application-support.jp
```

### 4. サーバーの状態を確認

- サーバーが起動しているか確認
- サーバー管理画面でSSH接続が有効になっているか確認

### 5. ネットワーク接続を確認

```powershell
# サーバーにpingを送信して接続を確認
ping kanazawa-application-support.jp

# またはIPアドレスで
ping 123.456.789.012
```

### 6. 既存のSSH接続設定を確認

既にサーバーに接続したことがある場合、`~/.ssh/config` ファイルに設定があるかもしれません：

```powershell
# SSH設定ファイルを確認
Get-Content ~/.ssh/config
```

設定があれば、その設定を使用して接続できます。

## SSH接続ができない場合

すべての方法を試しても接続できない場合：

1. **既存のポスターマッピングシステムへの接続方法を確認**
   - 以前にサーバーに接続したことがある場合、その方法を確認
   - SSH設定ファイル（`~/.ssh/config`）を確認

2. **サーバー管理画面から公開鍵を追加**
   - サーバー提供元の管理画面に公開鍵追加機能がある場合、そこから追加

3. **サーバー管理者に問い合わせ**
   - SSH接続情報（IPアドレス、ポート番号、ユーザー名）を確認
   - 公開鍵の追加方法を確認

詳細は `ALTERNATIVE_SSH_SETUP.md` を参照してください。

## 次のステップ

接続が成功したら、`SERVER_SSH_KEY_SETUP.md` の手順に従って公開鍵を追加してください。



