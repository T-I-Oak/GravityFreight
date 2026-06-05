# Specification: GameController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: ゲームプレイ進行の執行者。
- **責務**:
    - **ゲーム内遷移の統括**: ワープ演出、ビルド画面、航行画面、リザルト画面、および**各施設画面**の遷移制御。
    - **ゲーム内入力の処理**: ビルドパネル操作、Canvas 入力（パン・回転・AIM）、および**施設内取引ボタン**の処理。
    - **ロジックの実行**: セクター生成、パーツ消費、物理計算サービスの呼び出し、終了判定。
    - **表示データ生成の委譲**: ビルド画面の inventory 表示データは `BuildScreenPresenter` へ委譲し、`GameController` は現在状態と選択状態を渡す。

## 2. インターフェース (Interface)

### プロパティ (Properties)

- **`currentSector: Sector | null`**: 現在滞在しているセクターのデータインスタンス。
- **`currentRocket: Rocket | null`**: 現在組み立て済み、または航行中のロケットインスタンス。

### メソッド (Methods)

- **`constructor(infrastructure: object)`**
    - `AppOrchestrator` から渡される共通基盤（UI, Renderer, Sound, Data, Services 等）への参照を保持する。
    - `BuildScreenPresenter` を保持し、ビルド画面表示用 view data 生成に使用する。

- **`start(): void`**
    - ゲームを開始する。
    1. **ステート初期化**: `sessionState.initialize()` を実行。
    2. **ゲーム内ハンドラ登録**: `uiController` を介して、ビルドパネル操作、アセンブル、ローンチ、Canvas 入力、施設操作、ゲーム終了画面のタイトル復帰、および**メールアイコン押下**のハンドラを自身に紐付ける。
    3. **HUD初期化**: `uiController.initHUD(sessionState)` を実行し、初期値（Coins, Sector 等）の表示と、メールスロットのリセット（全ロック）を行う。
    4. **最初のセクターへ**: `this.beginSectorTransition()` を実行。

- **`confirmSettlement(settlement: SettlementResult): void`**
    - リザルト画面で「確定（OK）」が押された際の挙動を制御する。
    - **内部挙動**:
        1. **割引の保存**: `settlement.luckyDiscountRate` を **`currentSector.luckyDiscountRate`** へセットする。
        2. **分岐判定**:
            - `settlement.status === 'cleared'` の場合：`enterFacility(settlement.destination)` を実行。
            - それ以外の場合：
                - `checkGameOverAndStartEndSequence()` を実行する。
                - ゲームオーバーでない場合は、最新 inventory から `BuildScreenPresenter.createViewData()` を実行し、`uiController.showBuildScreen(viewData)` を実行。

- **`enterFacility(type: string): void`**
    - 指定された施設（Trading Post, Repair Dock, Black Market）へ入場する。
    - **内部挙動**:
        1. **データ準備**:
            - 交易所の場合、`EconomySystem.generateTradingPostStock(sessionState)` を実行。
            - Trading Post は、販売在庫と inventory 内の売却候補を表示用データへ変換する。
            - Repair Dock は、破損 launcher の修理候補と、現在の RocketItem の分解候補を表示用データへ変換する。
            - Black Market は、100c / 500c 取引メニューを表示用データへ変換する。
            - 施設画面の説明、セクション名、ボタン名、空表示文言は `GameDataRepository.getUiText()` で UI resource から取得する。
        2. **表示制御**: `uiController.showFacilityScreen(type, data)` を実行。
        3. **ハンドラ登録**: `uiController` を通じて、施設内ボタン（Buy, Sell, Repair 等）と `handleFacilityAction` を紐付ける。
    - Trading Post の販売在庫は入場時に生成し、取引後の再表示では同じ在庫状態を使用する。

- **`handleFacilityAction(action: string, context: object): void`**
    - 施設内での具体的な操作を処理する。
    - **内部挙動**:
        - Trading Post の `buy`: 入場時に生成した販売在庫から対象 item を取得し、購入価格と取得 item を含む `TransactionResult` を作成する。取引成功後は販売在庫から対象 item を除外する。
        - Trading Post の `sell`: inventory stack から売却対象 item を取得し、査定額と削除 item を含む `TransactionResult` を作成する。
        - Repair Dock の `repair`: 指定された launcher を取得し、`EconomySystem.createRepairTransaction()` が返す `TransactionResult` を使用する。
        - Repair Dock の `dismantle`: 現在の RocketItem を対象に `EconomySystem.createDismantleTransaction()` が返す `TransactionResult` を使用する。取引成功後は **`this.currentRocket = null`** を実行し、同一滞在中の解体回数を更新する。
        - Black Market の `buy_normal` / `buy_premium`: `EconomySystem.drawBlackMarketGacha()` が返す `TransactionResult` を使用する。
        - 作成した `TransactionResult` は `sessionState.applyTransaction(transaction)` へ渡す。支払い、item 追加・削除、施設固有の `onCommit` callback 実行は `SessionState` 側で一括反映する。
        - `applyTransaction()` が返す `TransactionDelta` を `GameRecordTracker` へ反映し、更新された記録キーを指定して `AchievementTracker.evaluateAchievements({ source: 'game_record', keys })` を呼び出す。
        - 取引後は施設画面の coin 表示を更新し、同じ施設の表示データを再生成して画面を更新する。

- **`leaveFacility(): void`**
    - 施設を出発し、次セクターへ向かう。
    - **内部挙動**:
        1. `checkGameOverAndStartEndSequence()` を実行する。
        2. ゲームオーバーでない場合は、`this.beginSectorTransition()` を実行。
        3. ※ 次セクター生成時に `Sector` インスタンスが新しくなるため、割引率は自動的に 0 にリセットされる。
    - セクター進行と契約終了判定の具体処理は `SectorProgressionController` に委譲する。

- **`checkGameOverAndStartEndSequence(): boolean`**
    - 航行結果確定後および施設退出時に共通利用するゲームオーバー判定フロー。
    - 実処理は `SectorProgressionController.checkGameOverAndStartEndSequence()` へ委譲する。
    - **内部挙動**:
        1. `EconomySystem.checkGameOver(sessionState)` を実行する。
        2. 戻り値が `null` の場合は `false` を返す。
        3. ゲームオーバー結果が返った場合は、ゲームリザルト表示用の `GameResultSummary` を `sessionState.getGameResultSummary()` で取得する。
        4. `GameRecordTracker.recordGameResult(gameResult)` を呼び出し、契約完了回数など契約終了時にのみ確定する記録値を更新する。
        5. `AchievementTracker.evaluateAchievements({ source: 'game_record', keys: ['lifetime_contracts'] })` を呼び出し、新規到達 tier があれば UI 通知へ渡す。
        6. `RankTracker.recordGameResult(gameResult)` を呼び出し、ランキング表示用レコードを更新する。
        7. `uiController.showGameEndSequence(gameResult, gameOver)` を実行し、`true` を返す。

- **`returnToTitle(): void`**
    - ゲーム終了画面のタイトル復帰操作を処理する。
    - **内部挙動**: `AppOrchestrator.returnToTitle()` へ制御を戻し、Game Lifecycle の終了を委譲する。

- **`handleItemSelection(uid: string): void`**
    - ビルド画面でのアイテム選択を処理する。
- **`assembleRocket(): void`**
    - ビルド画面でのロケット組み上げを処理する。
    - **内部挙動**:
        1. 選択パーツのバリデーションを実行。
        2. **`this.currentRocket = new Rocket(parts)`** を実行してインスタンスを生成。
        3. UI 側のローンチボタンを有効化する。
- **`handleCanvasInput(event: PointerEvent | WheelEvent): void`**
    - Canvas 上での入力（パン、回転、AIM）を処理する。

- **`beginSectorTransition(): Promise<void>`**
    - セクター間の遷移（ワープ演出）シーケンスを統括する。
    - セクター生成、セクター開始時記録、HUD / Renderer 更新は `SectorProgressionController.beginSectorTransition()` へ委譲する。
    1. **演出制御**: 背景・描画・音のワープ演出を開始。
        - ワープ演出の開始時点では、`currentSector` は前セクターのままとし、前セクターのマップへズームインして加速する演出を行う。
        - 演出途中で遠方から次セクターのマップが現れるタイミングで、新しい `Sector` を生成して `currentSector` を切り替える。
    2. **ロジック更新**: 
        - 次セクター生成時に `sessionState.sectorNumber` を更新。
        - **`this.currentSector = new Sector(sessionState, isAnomaly)`** を実行して新マップを生成。
        - `SessionState.reachedSector` が更新された場合は、`GameRecordTracker.recordSectorStart(sessionState)` を呼び出し、`AchievementTracker.evaluateAchievements({ source: 'game_record', keys: ['max_reached_sector'] })` を呼び出す。
    3. **同期**: HUDの数値表示（セクター番号等）を最新状態に更新し、`worldRenderer` への新マップセット、セクタータイトル表示を行う。
    4. **演出終了**: 各演出を停止し、完了後に `BuildScreenPresenter.createViewData(sessionState, currentBuildSelection)` で表示データを生成し、`uiController.showBuildScreen(viewData)` を実行。`uiController.setFlightMode(false)` で操作を有効化する。

- **`launchRocket(rocket: Rocket, angle: number): void`**
    - 航行シーケンスを開始する。
    - **内部挙動**:
        1. **パーツ消費**: 耐久度減算を含むアトミックな消費処理を実行。
        2. **発射時 snapshot 記録**: 発射角度、初速、発射構成、セクター状態が確定した直後に `FlightRecorder.captureLaunchSnapshot(rocket, currentSector)` を呼び出す。
        3. **UIモード遷移**: `uiController.setFlightMode(true)` を実行し、ビルドパネルをロックする。
        4. **描画開始**: `worldRenderer.startNavigation(rocket)` を実行。
        5. **ソナー開始**: `worldRenderer.enableSonar()` を実行し、波紋の生成を継続する（AIM状態から継続）。
        6. **ループ開始**: メインループでの `this.updateFlight()` の呼び出しを有効化。

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
            - `const settlement = EconomySystem.calculateSettlement(result, flightData, sessionState)` を実行。
        2. **状態反映（アトミック）**:
            - `sessionState.applySettlement(settlement)` を実行し、資産を確定させる。
            - **物語解放**: `settlement.unlockedBranchId` が存在する場合、その ID を用いて `StorySystem.unlockNextStep(id)` を実行する。
            - **リプレイ記録**: 航行単位のリプレイ記録は、この航行終了処理内で `FlightRecorder.recordFlightResult(resultContext)` を呼び出して確定する。`resultContext` には航行終了時メタ情報のみを含め、発射時 snapshot は `FlightRecorder` が保持している `pendingRecordDraft` を使用する。
            - **実績記録**: 航行終了時点で `GameRecordTracker.recordFlightResult(resultContext)` を必ず呼び出す。その後、航行終了時に更新された記録キーを指定して `AchievementTracker.evaluateAchievements({ source: 'game_record', keys })` を呼び出し、新規到達 tier があれば UI 通知へ渡す。
        3. **演出開始**:
            - `worldRenderer.disableSonar()`。
            - `worldRenderer.playFinishAnimation(result)` を実行。
        4. **演出完了待機**: `await` により演出完了を待機する。
        5. **画面遷移**:
            - `settlement`、リプレイ保存状態、実績通知、ストーリー状態から航行結果表示用 view data を生成する。
            - 航行結果タイトルと遷移ボタン文言は `GameDataRepository.getUiText()` で UI resource から取得する。セクター番号や施設名が必要な文言は取得後に `{sector}` / `{facility}` を置換する。
            - `uiController.showResultScreen(viewData)` を呼び出す。

- **`handleMailClick(index: number): void`**
    - 指定されたインデックス（0〜2）のメールボタンがクリックされた際の処理。
    - **内部挙動**:
        1. **状況確認**: `StorySystem.getStoryStatus()[index]` から対象の物語 ID を取得する。
        2. **メッセージ取得**: `StorySystem.getMessageData(status.id)` から詳細データを取得。
        3. **モーダル表示**: `uiController.showStoryModal(message)` を実行。
        4. **既読化・保存**: `StorySystem.updateReadStatus(message.id)` を実行する。その後 `AchievementTracker.evaluateAchievements({ source: 'story_read', keys: ['total', 'T', 'R', 'B'] })` を呼び出し、新規到達 tier があれば UI 通知へ渡す。
        5. **通知停止**: 該当スロットの明滅を停止させるため、再度 `uiController.updateMailStatus` で状態を更新する。
