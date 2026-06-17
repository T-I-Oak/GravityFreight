# Specification: AppOrchestrator Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: アプリケーションの基盤保持および全体管理。
- **責務**:
    - 共通基盤クラス（UI, Renderer, Sound, GameDataRepository, HowToPlayUI等）のインスタンス化と保持。
    - アプリ起動時の初期化シーケンス（`boot`）の統括。
    - タイトル画面演出とゲーム本編描画に同一の `BackgroundManager` を共有させ、星背景の連続性を維持する。
    - タイトル画面からゲーム本編を開始する状態遷移の制御。
    - ゲーム終了画面からタイトル画面へ戻る状態遷移の制御。

## 2. インターフェース (Interface)

- **`boot(): Promise<void>`**
    - アプリケーション起動の起点。
    1. 共通 env utility の `setAppVersion(package.version)` を実行し、共通 `DataManager` が使用するメジャーバージョンを初期化する。
    2. 各マネージャー・コントローラーをインスタンス化する。
    3. 共通 `DataManager` を内部依存として持つ `GameDataRepository` をインスタンス化する。
    4. `gameDataRepository.loadAllData()` を実行し、静的なマスタデータをロードする。
    5. 永続データを持つ各システム（Story, Achievement, Rank, FlightRecord 等）の `initialize()` を実行。
    6. **描画エンジンの初期化**: `WorldRenderer.initialize(uiController.getMapCanvas(), cameraController, backgroundManager)` を実行。
    7. **タイトル演出の初期化**: `TitleScreenAnimator.initialize(uiController.getTitleCanvases(), backgroundManager)` を実行する。`WorldRenderer` と `TitleScreenAnimator` には同一の `BackgroundManager` インスタンスを渡す。
    8. **タイトル画面の配線**: `uiController` を通じて開始ハンドラ、記録画面ハンドラ、リプレイ開始ハンドラを登録する。記録画面ハンドラは `showRecordScreen()` へ、リプレイ開始ハンドラは `startReplay(recordId)` へ接続する。
    9. **初期画面表示**: `uiController.showTitleScreen()` と `TitleScreenAnimator.start()` を実行。

- **`startGame(): void`**
    - ゲーム本編（プレイセッション）を開始する。
    1. `TitleScreenAnimator.stop()` を実行し、タイトル専用 Canvas 演出を停止する。
    2. `new GameController(infrastructure)` を実行（インフラ各層への参照を渡す）。
    3. `gameController.start()` を呼び出し、制御権を委譲する。
    - **段階実装**: v0.84 時点では、タイトルからゲーム開始し、Session 初期化、最初の Sector 生成、HUD / Build 画面表示、Canvas への Sector 描画までを接続する。

- **`returnToTitle(): void`**
    - ゲーム終了画面からタイトル画面へ戻る。
    - **内部挙動**:
        1. 現在の `GameController` への参照を破棄し、Game Lifecycle を終了する。
        2. App Lifecycle の各システム（記録、実績、設定、描画基盤等）は維持する。
        3. `uiController.showTitleScreen()` を実行する。
        4. `TitleScreenAnimator.start()` を実行する。共有 `BackgroundManager` は再生成せず、現在の星背景状態から描画を継続する。

- **`showRecordScreen(): void`**
    - タイトル画面の RECORDS 操作から Analytic Archive を表示する。
    - **内部挙動**:
        1. `ArchiveScreenPresenter` を生成し、App Lifecycle の `GameRecordTracker`, `RankTracker`, `AchievementTracker`, `FlightRecorder`, `GameDataRepository` を渡す。
        2. `ArchiveScreenPresenter.createViewData()` で Archive 表示用 view data を生成する。
        3. `uiController.showRecordScreen(viewData)` を呼び出す。

- **`startReplay(recordId: string): ReplayContext`**
    - Analytic Archive の Replays タブで選択された航行記録から、リプレイ再生用コンテキストを生成する。
    - **内部挙動**:
        1. `FlightRecorder.createReplayContext(recordId)` を呼び出す。
        2. 返却された `ReplayContext` を保持して返す。
    - **責務境界**: このメソッドはリプレイ再生用データの復元入口であり、物理再生ループ、再生画面への遷移、終了後の戻り導線はリプレイ再生実装側で扱う。
