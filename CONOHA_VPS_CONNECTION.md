# ConoHa VPSサーバーへの接続方法

## ConoHa VPSサーバーの特徴

ConoHaのVPSサーバーは、以下の方法で接続できます：

1. **VNCコンソール**（Webブラウザから直接接続）
2. **SSH接続**（ターミナルから接続）

## 接続情報の確認方法

### 1. ConoHaコントロールパネルにログイン

1. ConoHaのWebサイトにアクセス
2. コントロールパネルにログイン
3. VPSサーバーの一覧から該当サーバーを選択

### 2. サーバー情報を確認

ConoHaのコントロールパネルで以下を確認：

- **サーバーのIPアドレス**（グローバルIPアドレス）
- **ユーザー名**（通常は `root` または `vpsadmin`）
- **パスワード**（初期パスワードまたは設定したパスワード）
- **SSHポート番号**（通常は `22`）

### 3. VNCコンソールから接続（推奨）

ConoHaのコントロールパネルから：

1. **VPSサーバーを選択**
2. **「コンソール」**または**「VNC」**タブをクリック
3. **ブラウザ内でターミナルが開く**
4. ユーザー名とパスワードでログイン

VNCコンソールから接続できれば、そこで公開鍵を追加できます。

### 4. SSH接続（IPアドレスを使用）

ConoHaのコントロールパネルで確認したIPアドレスを使用：

```powershell
# ConoHaのコントロールパネルで確認したIPアドレスを使用
ssh root@サーバーのIPアドレス
# または
ssh vpsadmin@サーバーのIPアドレス
```

パスワードを聞かれたら、ConoHaのコントロールパネルで確認したパスワードを入力します。

## 公開鍵の追加方法

### 方法1: VNCコンソールから追加（推奨）

1. ConoHaのコントロールパネルからVNCコンソールを開く
2. サーバーにログイン
3. 以下のコマンドを実行：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAICQR3lCbhG/okee/qgXt7LvzsD1gYcSuzuXZKa1A+qAI mokoh@TomohikoSASANO" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
cat ~/.ssh/authorized_keys
```

### 方法2: SSH接続（パスワード認証）から追加

1. ConoHaのコントロールパネルで確認したIPアドレスとパスワードを使用してSSH接続
2. 接続後、上記のコマンドを実行

## GitHub Secretsの設定

ConoHaのコントロールパネルで確認した情報を使用：

- **DEPLOY_HOST**: ConoHaのコントロールパネルで確認した**IPアドレス**（ドメイン名ではなくIPアドレス）
- **DEPLOY_USER**: `root` または `vpsadmin`（ConoHaのコントロールパネルで確認）
- **DEPLOY_SSH_KEY**: 作成した秘密鍵の内容
- **DEPLOY_PORT**: `22`（通常はデフォルト）

## 注意点

- ConoHaのVPSサーバーは、**IPアドレスで直接接続**する方が確実です
- ドメイン名（`kanazawa-application-support.jp`）は、DNS設定でIPアドレスに解決される必要があります
- ConoHaのコントロールパネルで確認したIPアドレスを使用してください

## 次のステップ

1. **ConoHaのコントロールパネルにログイン**
2. **サーバーのIPアドレスとユーザー名を確認**
3. **VNCコンソールから接続して公開鍵を追加**
4. **GitHub SecretsにIPアドレスとユーザー名を設定**

