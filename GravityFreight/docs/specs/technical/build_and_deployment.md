# Build & Deployment (ビルド・作成・デプロイ)

本プロジェクトでは Vite を利用したビルド環境と、GitHub Actions による自動デプロイパイプラインを採用しています。

## 1. バージョン管理 (Versioning)

### 単一ソース原則
バージョン情報は `package.json` の `version` フィールドにて一括管理されます。

### バージョンの注入
- **JS 側**: Vite の `define` 設定により、グローバル定数 `__APP_VERSION__` がビルド時および開発時に注入されます。
- **HTML 側**: `UISystem` が初期化時に `Game.version` を読み取り、DOM (`#version`) を更新します。
- **キャッシュ対策**: ビルド時に生成されるアセット（JS/CSS）にはファイル名ハッシュが付与されるため、バージョンアップ時のブラウザキャッシュ問題を回避できます。

## 2. ビルドプロセス (Build Process)

### 開発モード
```powershell
npm run dev
```
Vite による高速なホットリロード環境で開発を行います。

### 本番用ビルド
```powershell
npm run build
```
`dist` ディレクトリに最適化された公開用ファイル一式が出力されます。

## 3. デプロイパイプライン (Deployment Pipeline)

### 自動デプロイフロー
1. `master` ブランチへのプッシュを検知して GitHub Actions (`.github/workflows/deploy.yml`) が起動。
2. `ubuntu-latest` 環境で `npm install` および `npm run build` を実行。
3. 生成された `dist` フォルダの内容を `gh-pages` ブランチへ自動プッシュ。
4. GitHub Pages により公開 URL が更新される。

### デプロイタイミング
原則として、各開発タスク完了後の `master` ブランチへの統合（プッシュ）時に自動的に実行されます。
