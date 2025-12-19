# TaskMap デプロイ状況

## デプロイ実行日時
2025年12月18日〜19日（最終的に安定稼働）

## コミット情報
- 現在は複数回の修正を経て、GitHub Actions の Deploy ワークフローが安定動作
- 最新の安定デプロイは GitHub Actions の実行履歴（Deploy TaskMap）で確認する

## デプロイの確認方法

### 1. GitHub Actionsでデプロイの進行状況を確認
https://github.com/TomohikoSASANO/task-map/actions

**確認ポイント：**
- ワークフローが実行中か（黄色のアイコン）
- デプロイが成功したか（緑色のチェックマーク）
- エラーがあればログを確認

### 2. デプロイが完了したらサイトにアクセス
https://task.kanazawa-application-support.jp/

**確認ポイント：**
- TaskMapが正しく表示されるか
- HTTPSが有効になっているか（鍵マークが表示される）
- モバイルUIが正しく動作するか

## デプロイワークフローの処理内容

1. ✅ コードチェックアウト
2. ✅ 依存関係のインストール (`npm ci`)
3. ✅ テスト実行 (`npm run test:ci`)
4. ✅ ビルド (`npm run build`)
5. ✅ ファイル転送（SCP、`dist/**`）
6. ✅ Dockerコンテナへのコピー（`poster-mapping-deploy-frontend-*`）
7. ✅ Nginx設定の配置（`00-task.kanazawa-application-support.jp.conf`）
8. ✅ 証明書発行/更新（必要時）
9. ✅ Nginxテストとリロード

## トラブルシューティング

### デプロイが失敗した場合

1. **GitHub Actionsのログを確認**
   - どのステップで失敗したか確認
   - エラーメッセージを確認

2. **よくある問題**
   - SSH接続エラー → GitHub Secretsを確認
   - ビルドエラー → ローカルで`npm run build`を実行して確認
   - Nginx設定エラー → `TROUBLESHOOTING.md`を参照

3. **サーバー側の確認**
   ```bash
   # ファイルが転送されているか確認
   ls -la /var/www/task.kanazawa-application-support.jp/
   
   # Dockerコンテナが実行中か確認
   docker ps | grep poster-mapping-deploy-frontend
   
   # Nginx設定を確認
   docker exec poster-mapping-deploy-frontend-1 nginx -t
   ```

## 次のステップ

デプロイが成功したら：
1. ✅ サイトにアクセスして動作確認
2. ⏳ チームメンバーにURLを共有
3. ⏳ フィードバックを収集して改善


