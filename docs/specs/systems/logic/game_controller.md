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
    2. **ゲーム内ハンドラ登録**: `uiController` を介して、ビルドパネル操作、アセンブル、ローンチ、Canvas 入力、および**メールアイコン押下**のハンドラを自身に紐付ける。
    3. **HUD初期化**: `uiController.initHUD(sessionState)` を実行し、初期値（Coins, Sector 等）の表示と、メールスロットのリセット（全ロック）を行う。
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
    4. **同期**: HUDの数値表示（セクター番号等）を最新状態に更新する。
    5. **演出終了**: 各演出を停止し、完了後に `uiController.showBuildScreen()` を実行。`uiController.setFlightMode(false)` で操作を有効化する。

- **`launchRocket(rocket: Rocket, angle: number): void`**
    - 航行シーケンスを開始する。
    - **内部挙動**:
        1. **パーツ消費**: 耐久度減算を含むアトミックな消費処理を実行。
        2. **UIモード遷移**: `uiController.setFlightMode(true)` を実行し、ビルドパネルをロックする。
        3. **描画開始**: `worldRenderer.startNavigation(rocket)` を実行。
        4. **ソナー開始**: `worldRenderer.setSonarActive(true)` を実行し、波紋の生成を継続する（AIM状態から継続）。
        5. **ループ開始**: メインループでの `this.updateFlight()` の呼び出しを有効化。

- **`updateFlight(dt: number): void`**
    - 航行中の更新処理（メインループから毎フレーム呼び出し）。物理計算、状態更新、および成功・失敗の判定監視を行う。
    - **内部挙動**:
        1. **物理更新**: `PhysicsEngine.step(currentRocket, currentSector)` を実行し、結果オブジェクト（`stepResult`）を受け取る。
        2. **HUD更新（毎フレーム）**: `stepResult.ticks` に基づき、`uiController.updateHUDValue` を通じてスコアを通知する。
        3. **終了判定**: `stepResult.collision` が存在する場合、ループを停止し `handleNavigationEnd(stepResult.collision)` を呼び出す。

- **`handleNavigationEnd(result: object): Promise<void>`**
    - 航行フェーズの終了処理（報酬計算、演出実行、画面遷移）を統括する。
    - **内部挙動**:
        1. **成果データの確定**:
            - `const flightData = currentRocket.getFlightResult()` を取得。
            - `const settlement = EconomySystem.calculateSettlement(result, flightData)` を実行。
        2. **状態反映（アトミック）**:
            - `sessionState.applySettlement(settlement)` を実行し、資産を確定させる。
            - **物語解放**: `settlement.unlockedBranchId` が存在する場合、その ID を用いて `StorySystem.unlockNextStep(id)` を実行する。
        3. **演出開始**:
            - `worldRenderer.disableSonar()`。
            - `worldRenderer.playFinishAnimation(result)` を実行。
        4. **演出完了待機**: `await` により演出完了を待機する。
        5. **画面遷移**:
            - `uiController.showResultScreen(settlement)` を呼び出す。

- **`handleMailClick(index: number): void`**
    - 指定されたインデックス（0〜2）のメールボタンがクリックされた際の処理。
    - **内部挙動**:
        1. **状況確認**: `StorySystem.getStoryStatus()[index]` から対象の物語 ID を取得する。
        2. **メッセージ取得**: `StorySystem.getMessageData(status.id)` から詳細データを取得。
        3. **モーダル表示**: `uiController.showStoryModal(message)` を実行。
        4. **既読化・保存**: `StorySystem.updateReadStatus(message.id)` を実行。
        5. **通知停止**: 該当スロットの明滅を停止させるため、再度 `uiController.updateMailStatus` で状態を更新する。
