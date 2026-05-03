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
        - `storySystem.initialize()`（ストーリー進捗の復元）
        - `achievementTracker.initialize()`（実績データの復元）
        - `flightRecorder.initialize()`（記録インデックスの構築）
    3. **ハンドラ登録（配線）**:
        - **タイトル画面**:
            - `uiController.setStartHandler(() => this.startGame())`
            - `uiController.setRecordHandler(() => uiController.showRecordScreen())`
            - `uiController.setManualHandler(() => uiController.showManualScreen())`
            - `uiController.setVolumeHandler((vol) => soundController.setSEVolume(vol))`
        - **ビルド画面**:
            - `uiController.setBuildPanelHandler(() => uiController.toggleBuildPanel())`
            - `uiController.setItemSelectionHandler((uid) => this.handleItemSelection(uid))`
            - `uiController.setAssembleHandler(() => this.assembleRocket())`
            - `uiController.setLaunchHandler(() => this.launchRocket())`
        - **その他**:
            - `uiController.setMailHandler(() => this.openStoryModal())`
            - `uiController.setResizeHandler((w, h) => { worldRenderer.handleResize(w, h); cameraController.handleResize(w, h); })`
            - `uiController.setCanvasInputHandler((e) => this.handleCanvasInput(e))`
    4. **初期画面表示**: `uiController.showTitleScreen()` を実行。

- **`handleItemSelection(uid: string): void`**
    - アイテム選択・解除の入力を受け、現在の選択状態を更新する。
    - **注記**: 具体的な選択ロジック（排他選択・解除ルール等）は、**シナリオ 3.1.3** の設計時に確定させる。
- **`assembleRocket(): void`**
    - 選択中のパーツを使用して新たな `RocketItem` を組み上げるプロセスを実行する。
    - **注記**: 素材の消費や生成の具体的なフローは、**シナリオ 3.1.3.3.4** の設計時に確定させる。
- **`openStoryModal(): void`**
    - 航行画面でのアイコン押下等により、ストーリーモーダルを表示し、既読化を行う。
    - **注記**: `StorySystem` との連携シーケンスの詳細は、**シナリオ 4.1.2** の設計時に確定させる。
- **`handleCanvasInput(event: PointerEvent | WheelEvent): void`**
    - Canvas 上での入力を受け、`CameraController` や `TrajectoryPredictor` へ適切な操作を命令する。
    - **注記**: モード判定（パン/回転/AIM）の具体的なロジックは、**シナリオ 3.1.1** の設計時に確定させる。

- **`startGame(): void`**
    - 新規ゲームを開始する。
    1. **ステート初期化**: `sessionState.initialize()` を実行し、初期所持金・初期装備・セクター番号 0 をセット。
    2. **ゲーム進行初期化**: `gameController.initialize()` を実行。
    3. **HUD初期化**: `sessionState` から初期値を取得し、`uiController.initHUD(initialData)` を実行。
    4. **遷移開始**: `beginSectorTransition()` をキックする。

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
    1. **パーツ消費（アトミック取引）**: 以下の手順を実行する。
        - **RocketItem**: `sessionState.inventory.popItemByUid(rocketItemStackUid)` で抽出。
        - **Launcher**: `popItemByUid` で抽出→ `preventsLauncherWear` フラグを確認→ フラグが偽の場合のみ `consumeCharge()` → 耐久度が 1 以上残っていれば `inventory.addItem()` で戻す。
        - **Booster**（装備中の場合）: `popItemByUid` で抽出→ `consumeCharge()` → 耐久度が 1 以上残っていれば `inventory.addItem()` で戻す。
    2. **画面遷移**: `uiController.showNavigationScreen()` を実行。
    3. **物理初期化**: ロケットの初速をセットし、`worldRenderer.startNavigation(rocket)` を実行。
    4. **航行ループ開始**: 
        - 1ティックごとに `PhysicsEngine.step(rocket, sector)` を実行。
        - **HUD更新**: 自身でカウントした累計ティック数を `baseScore` に加算し、`UIController.updateHUDValue('score', total)` を呼び出す。
        - **終了判定**: 成功・大破等の判定を監視し、終了時は `showResultScreen()` への遷移をトリガーする。
