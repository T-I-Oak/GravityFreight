# Specification: AppOrchestrator Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: アプリケーションの基盤保持および全体管理。
- **責務**: 
    - 共通基盤クラス（UI, Renderer, Sound, DataManager等）のインスタンス化と保持。
    - アプリ起動時の初期化シーケンス（`boot`）の統括。
    - タイトル画面からゲーム本編を開始する状態遷移の制御。

## 2. インターフェース (Interface)

- **`boot(): Promise<void>`**
    - アプリケーション起動の起点。
    1. 各マネージャー・コントローラーをインスタンス化する。
    2. `DataManager.loadAllData()` を実行。
    3. 各システム（Sound, Camera, Background, Story等）の `initialize()` を実行。
    4. **描画エンジンの初期化**: `WorldRenderer.initialize(uiController.getMapContainer(), camera, background)` を実行。
    5. **タイトル画面の配線**: `uiController` を通じて「開始」「記録」「説明書」「音量設定」のハンドラを登録する。
    6. **初期画面表示**: `uiController.showTitleScreen()` を実行。

- **`startGame(): void`**
    - ゲーム本編（プレイセッション）を開始する。
    1. `new GameController(infrastructure)` を実行（インフラ各層への参照を渡す）。
    2. `gameController.start()` を呼び出し、制御権を委譲する。
