# Specification: GameController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: ゲームプレイ進行の執行者。
- **責務**: 
    - **ゲーム内遷移の統括**: ワープ演出、ビルド画面、航行画面、リザルト画面の遷移制御。
    - **ゲーム内入力の処理**: ビルドパネル操作、Canvas 入力（パン・回転・AIM）の処理。
    - **ロジックの実行**: セクター生成、パーツ消費、物理計算、終了判定。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`constructor(infrastructure: object)`**
    - `AppOrchestrator` から渡される共通基盤（UI, Renderer, Sound, Data, Services 等）への参照を保持する。

- **`start(): void`**
    - ゲームを開始する。
    1. **ステート初期化**: `sessionState.initialize()` を実行。
    2. **ゲーム内ハンドラ登録**: `uiController` を介して、ビルドパネル操作、アセンブル、ローンチ、Canvas 入力等のハンドラを自身に紐付ける。
    3. **HUD初期化**: `uiController.initHUD(sessionState)` を実行。
    4. **最初のセクターへ**: `this.beginSectorTransition()` を実行。

- **`handleItemSelection(uid: string): void`**
    - ビルド画面でのアイテム選択を処理する。
- **`assembleRocket(): void`**
    - ビルド画面でのロケット組み上げを処理する。
- **`handleCanvasInput(event: PointerEvent | WheelEvent): void`**
    - Canvas 上での入力（パン、回転、AIM）を処理する。

- **`beginSectorTransition(): Promise<void>`**
    - セクター間の遷移（ワープ演出）シーケンスを統括する。
    1. **演出制御**: 背景・描画・音のワープ演出を開始。
    2. **ロジック更新**: `sessionState.sectorNumber` 更新、新 `Sector` 生成。
    3. **同期**: HUD更新、`worldRenderer` への新マップセット、セクタータイトル表示。
    4. **演出終了**: 各演出を停止し、完了後に `uiController.showBuildScreen()` へ遷移。

- **`launchRocket(rocket: Rocket, angle: number): void`**
    - 航行シーケンスを開始する。
    1. **パーツ消費**: 耐久度減算を含むアトミックな消費処理を実行。
    2. **遷移**: `uiController.showNavigationScreen()`, `worldRenderer.startNavigation(rocket)` を実行。
    3. **ループ開始**: メインループでの `this.updateFlight()` の呼び出しを有効化。

- **`updateFlight(dt: number): void`**
    - 航行中の更新処理（メインループから毎フレーム呼び出し）。物理計算、状態更新、および成功・失敗の判定監視を行う。
    - **内部挙動**:
        1. **物理更新**: `PhysicsEngine.step(currentRocket, currentSector)` を実行し、戻り値として最新の `ticks` を受け取る。
        2. **HUD更新（毎フレーム）**: スコアを算出し、`uiController.updateHUDValue` を通じて通知する。
            - **スコア**: `sessionState.totalScore + ticks` (累計 + 今回の滞在ティック数)
        3. **終了判定**: ロケットの位置が境界（900px）を超えたか、天体や出口に衝突したかを判定し、必要に応じて遷移処理を開始する。
