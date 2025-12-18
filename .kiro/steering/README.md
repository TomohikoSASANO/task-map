# TaskMap 仕様ドキュメント

このディレクトリには、仕様駆動開発（SDD）のためのドキュメントが含まれています。

## ドキュメント構成

- `overview.md` - プロジェクト概要
- `architecture.md` - アーキテクチャ設計
- `tasks.md` - タスクリスト

## 使用方法

1. 新規機能開発を開始する際は、`/kiro:spec-init [機能名]`を実行
2. 実装時は`/kiro:spec-impl task.md`を参照
3. タスクごとにコンテキストを解放（`/clear`）

## GitHub連携

- タスクはGitHub Issuesと連携
- `tasks.md`のタスクをGitHub Issuesに登録可能
- GitHub Projectでタスク管理

