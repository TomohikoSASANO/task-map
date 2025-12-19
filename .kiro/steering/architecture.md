# TaskMap アーキテクチャ

## ディレクトリ構造

```
task-map/
├── src/
│   ├── App.tsx          # メインアプリケーションコンポーネント
│   ├── Canvas.tsx       # ReactFlowキャンバスコンポーネント
│   ├── store.ts         # Zustand状態管理ストア
│   ├── types.ts         # TypeScript型定義
│   ├── components/      # UIコンポーネント
│   │   ├── TaskNode.tsx      # タスクノードコンポーネント
│   │   ├── Sidebar.tsx       # サイドバー（パレット）
│   │   ├── FloatingButton.tsx # モバイル用フローティングボタン
│   │   ├── Legend.tsx        # 凡例コンポーネント
│   │   └── edges/            # エッジ関連コンポーネント
│   └── hooks/          # カスタムフック
│       └── useIsMobile.ts    # モバイル判定フック
├── .github/
│   └── workflows/      # GitHub Actions
│       ├── ci.yml      # CI設定
│       └── deploy.yml  # デプロイ設定
└── dist/              # ビルド出力
```

## 状態管理（Zustand）

### ストア構造
- **Graph**: タスクとユーザーのデータ構造
  - `tasks`: タスクのマップ（TaskId -> Task）
  - `users`: ユーザーのマップ（UserId -> User）
  - `rootTaskIds`: ルートタスクのIDリスト

### 主要なアクション
- `createTask`: タスク作成
- `addChild`: 子タスク追加
- `updateTask`: タスク更新
- `linkPrecedence`: 依存関係のリンク
- `setNodePosition`: ノード位置設定
- `toggleExpand`: ノードの展開/折りたたみ

### 永続化
- Zustandの`persist`ミドルウェアを使用
- ローカルストレージに保存（`task-map-store`）

## UI/UX設計

### PC版（画面幅 >= 1024px）
- 右側に常時表示されるサイドバー（パレット）
- キャンバス全体を使用

### モバイル版（画面幅 < 1024px）
- サイドバーは通常非表示
- 画面下部20%をパレット表示ゾーンとして使用
- タブ切り替え（登録済メンバー&タスク、メンバー追加、全パレット表示）
- 右下にフローティングボタン
- 長押しドラッグでノード追加

## データフロー

1. **ユーザー操作** → ReactFlowイベント
2. **イベントハンドラ** → Zustandストアのアクション呼び出し
3. **ストア更新** → 自動的にコンポーネント再レンダリング
4. **永続化** → ローカルストレージに自動保存

## デプロイフロー

1. `main`ブランチにプッシュ
2. GitHub Actionsが自動実行
3. `npm ci` → `npm run test:ci` → `npm run build`
4. `dist/*`をサーバーにSCPで転送
5. Dockerコンテナ内にファイルをコピー
6. Nginxをリロード


