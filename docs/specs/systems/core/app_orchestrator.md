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
    8. **タイトル画面の配線**: `uiController` を通じて開始ハンドラ、説明書ハンドラ、記録画面ハンドラ、記録画面 Story タブのストーリー表示ハンドラ、リプレイ開始ハンドラ、リプレイ保護共通フローの handler / records provider を登録する。説明書ハンドラは `UIController.showManualScreen()` へ、記録画面ハンドラは `showRecordScreen()` へ、Story タブの表示ハンドラは `UIController.showStoryModal(storyId)` へ、リプレイ開始ハンドラは `startReplay(recordId)` へ、リプレイ保護 handler は `setReplayProtect(request)` へ接続する。
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

- **`#refreshLanguageDependentUI(): void`**
    - 設定画面で言語が切り替えられたとき、表示中 UI を現在の言語に追従させる。
    - **内部挙動**:
        1. `gameDataRepository.getAppMetadata()` を再取得し、`UIController.setAppMetadata()` へ渡す。
        2. `UIController.refreshManualLanguage()` を呼び、How To Play 表示中の場合は表示言語を更新する。
        3. `UIController.refreshLanguageDependentUI()` を呼び、表示中 hover / popup を更新する。
        4. リプレイ再生中の場合は、保持中の `ReplayContext` から replay 用 build view data を再生成し、`UIController.showReplayScreen(record, replayBuildViewData)` を呼ぶ。
        5. Analytic Archive 表示中の場合は、`UIController.getRecordScreenState()` で現在タブを取得し、`showRecordScreen({ activeTab })` で同じタブを再描画する。
        6. `GameController.refreshCurrentView()` が存在する場合は呼び出し、ビルドパネル、施設画面、航行結果画面など現在のゲーム画面を再描画する。
    - **責務境界**: 言語選択 UI の初期化と保存は共通 i18n / `SettingsDialogView` 側が担当する。`AppOrchestrator` は切り替え後の再描画順序だけを統括する。

- **`showRecordScreen(options?: { activeTab?: string }): void`**
    - タイトル画面の RECORDS 操作から Analytic Archive を表示する。
    - **内部挙動**:
        1. `ArchiveScreenPresenter` を生成し、App Lifecycle の `GameRecordTracker`, `RankTracker`, `AchievementTracker`, `FlightRecorder`, `GameDataRepository`, `StorySystem` を渡す。
        2. `ArchiveScreenPresenter.createViewData()` で Archive 表示用 view data を生成する。
        3. `uiController.showRecordScreen(viewData, options)` を呼び出す。
        4. `options.activeTab` が指定された場合は、Archive の初期表示タブとして UIController へ渡す。

- **`startReplay(recordId: string): ReplayContext`**
    - Analytic Archive の Replays タブで選択された航行記録から、リプレイ再生用コンテキストを生成する。
    - **内部挙動**:
        1. `FlightRecorder.createReplayContext(recordId)` を呼び出す。
        2. 返却された `ReplayContext` を保持する。
        3. `CameraController.reset({ persist: false })` と `WorldRenderer.resetMapWarp()` を呼び、永続カメラ設定や直前のゲームオーバー逆ワープ状態を引き継がず、通常表示で再生を開始する。
        4. 復元した `Rocket` から replay 用の read-only build view data を生成する。`rocketItem`, `launcher`, `booster` を FLIGHT タブの item card として表示し、ASSEMBLE / LAUNCH は無効状態にする。
        5. `UIController.hideRecordScreen()` と `UIController.showReplayScreen(record, replayBuildViewData)` で Archive overlay を閉じ、リプレイ再生画面へ切り替える。
        6. リプレイ HUD は `reachedSector` と score `0` で初期化する。score は再生中に `NavigationLoopController` から tick 数として更新される。
        7. `WorldRenderer.setSector(sector)`、`WorldRenderer.startNavigation(rocket)`、`WorldRenderer.enableSonar()` を呼び、復元済み初期状態を描画対象にする。
        8. replay 用の `MapInteractionController` を接続し、パン、ズーム、回転、星情報 hover などの閲覧操作を許可する。
            - replay 用 controller の build selection は空にし、AIM、予測線更新、発射、構成変更などゲーム進行に影響する操作は成立しない状態にする。
        9. `NavigationLoopController.start({ rocket, sector, onNavigationEnd })` を呼び、保存された snapshot から物理シミュレーションを再実行する。
        10. 航行終了時は `WorldRenderer.playFinishAnimation()` で終了演出を行い、最終セクターのマップ表示を維持した停止状態にする。リプレイ状態は保持し、終了ボタン操作まで Analytic Archive へ戻らない。
        11. 終了ボタン押下時はリプレイ状態を解除し、Analytic Archive の Replays タブに戻る。
    - **責務境界**: リプレイ記録の復元は `FlightRecorder`、発射構成表示用 view data の抽出は `AppOrchestrator`、物理再生は `NavigationLoopController`、描画は `WorldRenderer`、再生画面の表示切替は `UIController` が担当する。

- **`stopReplay(): null`**
    - 現在のリプレイ再生を終了し、Analytic Archive に戻る。
    - **内部挙動**:
        1. `NavigationLoopController.stop()` を呼び、再生ループを停止する。
        2. replay 用 map input handler を解除し、Archive 復帰後に map 操作が残らないようにする。
        3. `WorldRenderer.disableSonar()` と `WorldRenderer.startNavigation(null)` で航行描画状態を解除する。
        4. `UIController.hideReplayScreen()` を呼ぶ。
        5. 保持している `ReplayContext` を破棄する。
        6. `WorldRenderer.setRenderLoopActive(false)`、`UIController.showTitleScreen()`、`TitleScreenAnimator.start()` でタイトル画面を背面に復帰させる。
        7. `showRecordScreen({ activeTab: 'replays' })` を実行し、Archive の Replays タブに戻る。

- **`setReplayProtect(request: ReplayProtectRequest): FlightRecord | null`**
    - 航行結果画面または Analytic Archive の Replays タブで変更された保護状態を永続データへ反映する。
    - **内部挙動**:
        1. `request.source === 'result'` の場合は、現在の `GameController.handleResultProtect(request.favorite, { replaceRecordId })` を呼び出す。
        2. それ以外の場合は、`FlightRecorder.setFavorite(request.recordId, request.favorite)` を呼び出す。
        3. 更新後のリプレイ記録を返す。
    - **責務境界**: 5件上限、解除候補選択、キャンセル処理は `ReplayProtectFlow` が担当する。`AppOrchestrator` は永続更新先の振り分けだけを担当する。
