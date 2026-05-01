# Specification: GameOrchestrator Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: メインコントローラー。
- **責務**: 全体ステートマシンの管理、各ライフサイクルの開始・終了（Begin/End Contract）のトリガー。

## 2. インターフェース (Interface)

- **`boot(): Promise<void>`**
    - アプリケーション起動の起点。以下のプロセスを順次実行し、タイトル画面へ遷移させる。
    1. **データロード**: `DataManager.loadAllData()` を実行。
    2. **システム初期化**:
        - `soundController.initialize()`（設定復元）
        - `cameraController.initialize()`（状態復元）
        - `backgroundManager.initialize()`（背景生成）
    3. **ハンドラ登録（配線）**:
        - `uiController.setStartHandler(() => this.startGame())`
        - `uiController.setRecordHandler(() => uiController.showRecordScreen())`
        - `uiController.setManualHandler(() => uiController.showManualScreen())`
        - `uiController.setResizeHandler((w, h) => worldRenderer.handleResize(w, h))`
    4. **初期画面表示**: `uiController.showTitleScreen()` を実行。

- **`startGame(): void`**
    - 新規ゲームを開始する。プレイヤー状態の初期化、セクター番号の「0」セットを行い、`beginSectorTransition()` をキックする。

- **`beginSectorTransition(): Promise<void>`**
    - セクター間の遷移（ワープ演出）シーケンスを以下の順序で統括する。
    1. **演出開始**: `backgroundManager.accelerateWarp(duration)` および `worldRenderer.animateWarpOut(duration)` を実行。ワープSEの再生開始。
    2. **判定と分配**:
        - `sessionState.sectorNumber` を更新。
        - **アノマリー判定**: セクター番号が 5 の倍数かどうかを判定（`isAnomaly`）。
    3. **データ生成**:
        - `isAnomaly` フラグを渡し、`new Sector(sessionState, isAnomaly)` を実行して新マップを生成。
        - 生成したマップを `worldRenderer.setSector()` にセット。
    4. **UI表示**: `uiController.showSectorTitle(num, isAnomaly)` を呼び出し、タイトルを表示。
    5. **演出終了**: `backgroundManager.decelerateWarp(duration)` および `worldRenderer.animateWarpIn(duration)` を実行。完了後にビルド画面（ロケット構成変更）へと遷移させる。

