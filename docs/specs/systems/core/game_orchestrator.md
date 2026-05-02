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
    - 新規ゲームを開始する。
    1. **ステート初期化**: プレイヤー状態の初期化、セクター番号の「0」セットを実行。
    2. **HUD初期化**: `SessionState` から初期値を取得し、`uiController.initHUD(initialData)` を実行。
    3. **遷移開始**: `beginSectorTransition()` をキックする。

- **`beginSectorTransition(): Promise<void>`**
    - セクター間の遷移（ワープ演出）シーケンスを以下の順序で統括する。
    1. **演出開始**: `backgroundManager.startWarpEffect(duration)`, `worldRenderer.startWarpEffect(duration)`, `soundController.startWarpEffect(duration)` を実行。
    2. **判定と分配**:
        - `sessionState.sectorNumber` を更新。
        - **HUD更新**: `uiController.updateHUDValue('sector', sessionState.sectorNumber)` を実行。
        - **アノマリー判定**: セクター番号が 5 の倍数かどうかを判定（`isAnomaly`）。
    3. **データ生成**:
        - `isAnomaly` フラグを渡し、`new Sector(sessionState, isAnomaly)` を実行して新マップを生成。
        - 生成したマップを `worldRenderer.setSector()` にセット。
    4. **UI表示**: `uiController.showSectorTitle(num, isAnomaly)` を呼び出し、タイトルを表示。
    5. **演出終了**: `backgroundManager.stopWarpEffect(duration)`, `worldRenderer.stopWarpEffect(duration)`, `soundController.stopWarpEffect(duration)` を実行。完了後にビルド画面（ロケット構成変更）へと遷移させる。
- **`launchRocket(rocket: Rocket, angle: number): void`**
    - 航行シーケンスを開始する。
    1. **画面遷移**: `UIController.showNavigationScreen()` を実行。
    2. **物理初期化**: ロケットの初速をセットし、`worldRenderer.startNavigation(rocket)` を実行。
    3. **航行ループ開始**: 
        - 1ティックごとに `PhysicsEngine.step(rocket, sector)` を実行。
        - **HUD更新**: 自身でカウントした累計ティック数を `baseScore` に加算し、`UIController.updateHUDValue('score', total)` を呼び出す。
        - **終了判定**: 成功・大破等の判定を監視し、終了時は `showResultScreen()` への遷移をトリガーする。
