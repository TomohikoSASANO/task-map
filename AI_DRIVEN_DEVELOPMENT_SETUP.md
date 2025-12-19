# AI駆動開発体制セットアップガイド

このドキュメントは、[AIコーディング実践環境の構築方法【2025年12月】](https://zenn.dev/mkj/articles/bf59c4c86d98a8)の記事に基づいて、現在のプロジェクトを記事の開発体制に極限まで近づけるための手順です。

## 前提条件

- Node.jsとnpmがインストールされていること
- GitHubアカウントがあること
- VS Codeエディタがインストールされていること（推奨）

## ステップ1: 必要なツールのセットアップ

### 1.1 GitHub CLI (ghコマンド) のセットアップ

**Windowsの場合：**
```powershell
# wingetを使用する場合
winget install --id GitHub.cli

# または公式サイトからダウンロード
# https://cli.github.com/
```

**インストール後の認証：**
```powershell
gh auth login
```

### 1.2 Claude Codeのセットアップ（推奨）

```powershell
npm install -g @anthropic-ai/claude-code
```

### 1.3 MCPサーバー管理ツール（mmcp）のセットアップ

```powershell
npm install -g mmcp

# 使用するAIコーディングツールを登録
mmcp agents add claude-code codex-cli gemini-cli
```

### 1.4 推奨MCPサーバーの追加

**Context7（最新仕様ドキュメント提供）:**
```powershell
mmcp add context7 -- npx -y @upstash/context7-mcp
mmcp apply
```

**playwright（ブラウザ操作・テスト）:**
```powershell
mmcp add playwright -- npx -y @playwright/mcp@latest
mmcp apply
```

## ステップ2: 仕様駆動開発（SDD）のセットアップ

### 2.1 cc-sddの初期化

プロジェクトディレクトリで実行：

```powershell
cd c:\Users\mokoh\task-map
npx cc-sdd@latest --claude --lang ja
```

これにより、以下のディレクトリとファイルが生成されます：
- `.kiro/steering/` - 仕様ドキュメント
- `.claude/` - Claude Code設定（Git管理外）
- `.kiro/settings` - Kiro設定（Git管理外）

### 2.2 既存プロジェクトのドキュメント化

既存のコードからドキュメントを生成する場合、AIコーディングツールで以下を実行：

```
/kiro:steering
```

### 2.3 新規機能開発の開始

新規機能を開発する場合、AIコーディングツールで以下を実行：

```
/kiro:spec-init [機能名]
```

例：
```
/kiro:spec-init モバイルUI改善
```

## ステップ3: GitHub Projectとの連携

### 3.1 GitHub Projectアクセス権限の設定

```powershell
gh auth refresh -s project
```

### 3.2 タスクをGitHub Issuesに登録

AIコーディングツールで以下を実行：

```
@tasks.md をGitHubのissueにghコマンドで登録してください。
```

### 3.3 GitHub Projectの作成

1. GitHub上でProjectを作成（Roadmap形式を推奨）
2. リポジトリとProjectを紐づけ

### 3.4 スケジュールの設定

AIコーディングツールで以下を実行（プロジェクトURLは実際のものに置き換え）：

```
すべてのgithub issuesにStart dateとTarget dateを設定してください
1ヶ月で終わるように、タスクの難易度に応じてスケジュールを設定してください
GitHub Projectsのカスタムフィールドとして設定してください。プロジェクトは以下です。
https://github.com/users/[ユーザー名]/projects/[プロジェクト番号]/
```

## ステップ4: 開発フローの確立

### 4.1 実装の開始

AIコーディングツールで以下を実行：

```
/kiro:spec-impl task.mdをもとに続きから順に実装してください。タスクはGitHub issueとも対応しているので、そちらも合わせて対処してください
```

### 4.2 Pull Requestの作成

実装完了後、AIコーディングツールで以下を実行：

```
commitしてpushしてghでPull Requestしてください
```

### 4.3 コンテキストの解放

タスクごとにコンテキストを解放（Claude Codeの場合）：

```
/clear
```

## ステップ5: コードレビューの設定

### 5.1 GitHub Copilotの活用

GitHub Copilotを使用してコードレビューの抜け漏れを防止。

参考: https://docs.github.com/ja/copilot/how-tos/use-copilot-agents/request-a-code-review

### 5.2 AIコーディングツールでのレビュー

AIコーディングツールで以下を実行：

```
以下のPull Requestをレビューしてください
<PRのURL>
```

## 重要な原則

記事で強調されている4つの原則：

1. **ドキュメントの重要性（仕様駆動開発）**
   - コードと同様、ドキュメントも重要
   - `.kiro/steering/`以下のドキュメントを管理

2. **ルールベースの自動化**
   - Lint/Formatの設定を活用
   - ファイル保存時に自動チェック

3. **様々なツールを柔軟に活用する**
   - 特定のツールにロックインされない
   - ツールが変わってもドキュメントは活用可能

4. **習うより慣れる**
   - まずやってみる
   - 定期的に`/clear`でコンテキストを解放

## 次のステップ

1. 上記のツールをセットアップ
2. `cc-sdd`を初期化
3. 既存プロジェクトのドキュメント化を開始
4. GitHub Projectと連携
5. 開発フローを実践

## 参考リンク

- [AIコーディング実践環境の構築方法【2025年12月】](https://zenn.dev/mkj/articles/bf59c4c86d98a8)
- [TIS株式会社様のガイドライン](https://fintan-contents.github.io/gai-dev-guide/)
- [cc-sdd公式マニュアル](https://github.com/karaage0703/cc-sdd)



