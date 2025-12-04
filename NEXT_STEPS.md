# 次のステップ：SSH鍵の設定完了後

SSH鍵の作成が完了しました！次に以下の手順を実行してください。

## 1. 秘密鍵をGitHub Secretsに設定

### PowerShellで秘密鍵の内容をクリップボードにコピー

```powershell
# まず、作成された鍵ファイルを確認
Get-ChildItem ~/.ssh

# 作成した鍵のファイル名に合わせて実行（ファイル名に特殊文字がある場合は引用符で囲む）
# 例: ファイル名が "Takafumi0812!" の場合
Get-Content "~/.ssh/Takafumi0812!" | Set-Clipboard

# または、絶対パスで指定
Get-Content "$env:USERPROFILE\.ssh\Takafumi0812!" | Set-Clipboard
```

これで秘密鍵の内容がクリップボードにコピーされます。

### GitHubで設定

1. GitHubリポジトリのページを開く
2. **Settings** → **Secrets and variables** → **Actions** をクリック
3. **New repository secret** をクリック
4. 以下を設定：
   - **Name**: `DEPLOY_SSH_KEY`
   - **Secret**: クリップボードの内容を貼り付け（`-----BEGIN OPENSSH PRIVATE KEY-----` から `-----END OPENSSH PRIVATE KEY-----` まで全て）

## 2. 公開鍵をサーバーに登録

### PowerShellで公開鍵の内容を表示

```powershell
# 公開鍵の内容を表示（ファイル名に特殊文字がある場合は引用符で囲む）
Get-Content "~/.ssh/Takafumi0812!.pub"
# または
Get-Content "$env:USERPROFILE\.ssh\Takafumi0812!.pub"
```

表示された内容をコピーしてください（1行の文字列です）。

### サーバーに接続して公開鍵を追加

```powershell
# サーバーにSSH接続（パスワード認証で接続できる場合）
ssh DEPLOY_USER@DEPLOY_HOST

# サーバー側で実行
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ここに公開鍵の内容を貼り付け" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 3. その他のGitHub Secretsを設定

GitHubリポジトリの Settings > Secrets and variables > Actions で以下も設定：

- **DEPLOY_HOST**: サーバーのIPアドレスまたはドメイン（例: `kanazawa-application-support.jp`）
- **DEPLOY_USER**: SSH接続用のユーザー名（例: `ubuntu`）
- **DEPLOY_PORT**: SSHポート（デフォルト: `22`、カスタムポートを使用している場合のみ）

## 4. 接続テスト

```powershell
# 作成した鍵でサーバーに接続できるかテスト（ファイル名に特殊文字がある場合は引用符で囲む）
ssh -i "~/.ssh/Takafumi0812!" DEPLOY_USER@DEPLOY_HOST
# または
ssh -i "$env:USERPROFILE\.ssh\Takafumi0812!" DEPLOY_USER@DEPLOY_HOST
```

これが成功すれば、GitHub Actionsでも動作します。

## 5. デプロイの実行

すべての設定が完了したら、`main`ブランチにプッシュしてデプロイを実行：

```bash
git add .
git commit -m "Add deployment configuration"
git push origin main
```

GitHub Actionsのログでデプロイの成功/失敗を確認できます：
- リポジトリページ → **Actions** タブ → 最新のワークフロー実行をクリック



