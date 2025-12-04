# Task Map

タスク管理を視覚的に行うためのノードベースのマッピングシステムです。

## 機能

- タスクの階層構造の可視化
- タスク間の依存関係の管理
- 担当者の割り当て
- 期日の設定と管理
- モバイル対応UI（画面幅1024px未満）
- ドラッグ&ドロップによる直感的な操作

## 開発環境のセットアップ

### 必要な環境

- Node.js 20以上
- npm

### インストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

開発サーバーは `http://localhost:5173` で起動します。

### ビルド

```bash
npm run build
```

ビルド結果は `dist/` ディレクトリに出力されます。

### テスト

```bash
npm test
```

## デプロイ

本システムは `task.kanazawa-application-support.jp` にデプロイされています。

### 自動デプロイ

`main` ブランチにプッシュすると、GitHub Actionsが自動的にビルドしてデプロイします。

### デプロイ設定

詳細は [DEPLOY.md](./DEPLOY.md) を参照してください。

## 技術スタック

- **React 18** - UIフレームワーク
- **TypeScript** - 型安全性
- **Vite** - ビルドツール
- **ReactFlow** - ノードベースUI
- **Zustand** - 状態管理
- **Tailwind CSS** - スタイリング
- **Framer Motion** - アニメーション

## ライセンス

ISC
