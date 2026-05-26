# Specification: AppOrchestrator Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: アプリケーションの基盤保持および全体管理。
- **責務**:
    - 共通基盤クラス（UI, Renderer, Sound, GameDataRepository, HowToPlayUI等）のインスタンス化と保持。
    - アプリ起動時の初期化シーケンス（`boot`）の統括。
    - タイトル画面からゲーム本編を開始する状態遷移の制御。
    - ゲーム終了画面からタイトル画面へ戻る状態遷移の制御。

## 2. インターフェース (Interface)

- **`boot(): Promise<void>`**
    - アプリケーション起動の起点。
    1. 各マネージャー・コントローラーをインスタンス化する。
    2. 共通 `DataManager` を内部依存として持つ `GameDataRepository` をインスタンス化する。
    3. `gameDataRepository.loadAllData()` を実行し、静的なマスタデータをロードする。
    4. 各システム（Sound, Camera, Background, Story, HowToPlay等）の `initialize()` を実行。
    5. **描画エンジンの初期化**: `WorldRenderer.initialize(uiController.getMapContainer(), camera, background)` を実行。
    6. **How To Play の配線**: `HowToPlayUI` に `GameDataRepository`, `UIComponents`, `HowToPlayDiagrams` を渡し、説明書本体の表示制御を委譲する。
    7. **タイトル画面の配線**: `uiController` を通じて「開始」「記録」「説明書」「音量設定」のハンドラを登録する。説明書ボタンは `howToPlayUI.show()` へ接続する。
    8. **初期画面表示**: `uiController.showTitleScreen()` を実行。

- **`startGame(): void`**
    - ゲーム本編（プレイセッション）を開始する。
    1. `new GameController(infrastructure)` を実行（インフラ各層への参照を渡す）。
    2. `gameController.start()` を呼び出し、制御権を委譲する。

- **`returnToTitle(): void`**
    - ゲーム終了画面からタイトル画面へ戻る。
    - **内部挙動**:
        1. 現在の `GameController` への参照を破棄し、Game Lifecycle を終了する。
        2. App Lifecycle の各システム（記録、実績、設定、描画基盤等）は維持する。
        3. `uiController.showTitleScreen()` を実行する。
