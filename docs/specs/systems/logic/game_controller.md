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
- **`trajectoryPredictor: TrajectoryPredictor`**: AIM 中の予測軌道計算に使用するサービス。

### メソッド (Methods)

- **`constructor(infrastructure: object)`**
    - `AppOrchestrator` から渡される共通基盤（UI, Renderer, Sound, Data, Services 等）への参照を保持する。
    - `BuildScreenPresenter` を保持し、ビルド画面表示用 view data 生成に使用する。

- **`start(): void`**
    - ゲームを開始する。
    1. **ステート初期化**: `sessionState.initialize()` を実行。
    2. **ゲーム内ハンドラ登録**: `uiController` を介して、ビルドパネル操作、アセンブル、ローンチ、Canvas 入力、施設操作、ゲーム終了画面のタイトル復帰、および**メールアイコン押下**のハンドラを登録する。ビルドアイテム選択は `BuildFlowController.handleItemSelection()` へ、ローンチボタン操作は `launchSelectedRocket()` へ委譲する。ビルドアイテム選択後は、AIM 可能状態であれば予測軌道を再計算する。
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

- **ビルドアイテム選択**
    - ビルド画面でのアイテム選択は `BuildFlowController.handleItemSelection(selection)` へ委譲する。
    - `GameController` は選択状態を直接保持せず、ビルド画面の選択状態・再描画は `BuildFlowController` の責務とする。
- **`assembleRocket(): void`**
    - ビルド画面でのロケット組み上げ操作を `BuildFlowController.assembleRocket()` へ委譲する。
    - **内部挙動**:
        1. `UIController.setBuildAssembleHandler()` で ASSEMBLE ボタン操作を登録する。
        2. ボタン押下時に `BuildFlowController.assembleRocket()` を呼び出す。
        3. `BuildFlowController` が選択パーツを inventory から取り出し、`RocketItem` を inventory へ追加してビルド画面を再描画する。
- **`handleCanvasInput(event: CanvasInputEvent): void`**
    - Canvas 上での入力（パン、回転、ズーム、AIM）を処理する。
    - **内部挙動**:
        1. `pointerdown` 時点で操作モードを確定する。Shift / Ctrl 押下時はパン、マップ領域外は回転、AIM 可能状態のマップ領域内は AIM、それ以外のマップ領域内はパンとする。
        2. `pointermove` はドラッグ開始時に確定したモードを維持して処理する。UI パネル上や Canvas 外を通過しても、UIController から継続通知された入力を同じ操作として扱う。
        3. パン、回転、ズームは `CameraController` へ委譲し、描画更新後に操作終了時またはホイール入力時にカメラ状態を保存する。
        4. 2本指操作から通知される `pinch` は、中心点移動をパン、距離比をズームとして扱う。
        5. AIM はポインタのスクリーン座標を `CameraController.toWorld()` でワールド座標へ変換し、母星中心からの角度を現在の発射角度として保持する。発射時はこの角度を `Rocket` 生成へ渡し、初期位置を母星中心から `home.radius + gameBalance.SHIP_START_OFFSET` world px の位置に設定する。
        6. AIM 可能状態では、選択中の RocketItem / Launcher / Booster を inventory から消費せずに参照し、プレビュー用 `Rocket` を生成する。`WorldRenderer.setAimRocket(previewRocket)` と `WorldRenderer.enableSonar()` を呼び出し、AIM 中のロケット本体とソナーを常時表示する。
        7. `TrajectoryPredictor.predictPath(previewRocket, currentSector)` の結果から `actualTrail` を取り出し、発射位置を先頭に加えた座標列を `WorldRenderer.setPredictionPath()` へ渡す。AIM 可能状態の間、予測線は常に表示対象とする。AIM 可能状態で `actualTrail` が空になる場合は、予測計算またはパーツ性能定義の不整合として扱い、代替線で隠蔽しない。
        8. `hover` は `CameraController.toWorld()` でワールド座標へ変換し、`CelestialBody` の半径に `mapConstants.STAR_HIT_MARGIN` を加味して対象天体を判定する。対象天体が item を保持している場合のみ `UIController.showStarInfo(body, displayPoint)` を呼び出し、それ以外は `UIController.hideStarInfo()` を呼び出す。`hoverleave` では必ず非表示にする。
    - **責務境界**: ブラウザイベントの購読や2本指入力の正規化は `UIController`、座標変換・パン・回転・ズームの実計算は `CameraController`、描画更新は `WorldRenderer` の責務とする。

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
    4. **演出終了**: 各演出を停止し、完了後に `BuildFlowController.showBuildScreen()` を実行。`uiController.setFlightMode(false)` で操作を有効化する。

- **`launchRocket(rocket: Rocket, angle: number): void`**
    - 航行シーケンスを開始する。
    - **内部挙動**:
        1. **発射状態の確定**: `Rocket.getInitialVelocity()` で初速を算出し、`rocket.velocity` へ反映する。
        2. **発射時 snapshot 記録**: 発射角度、初速、発射構成、セクター状態が確定した直後に `FlightRecorder.captureLaunchSnapshot(rocket, currentSector)` を呼び出す。
        3. **UIモード遷移**: `uiController.setFlightMode(true)` を実行し、ビルドパネルをロックする。
        4. **描画開始**: `worldRenderer.startNavigation(rocket)` を実行。
        5. **ソナー開始**: `worldRenderer.enableSonar()` を実行し、波紋の生成を継続する（AIM状態から継続）。
        6. **ループ開始**: メインループでの `this.updateFlight()` の呼び出しを有効化。

- **`launchSelectedRocket(): Rocket`**
    - FLIGHT タブで選択済みの発射構成から `Rocket` を生成し、`launchRocket()` へ渡す。
    - **内部挙動**:
        1. `BuildFlowController.currentBuildSelection` から `rocket`, `launcher`, `booster` の stack uid を取得する。`rocket` と `launcher` が未選択のまま呼び出された場合は UI 状態とロジック状態の不整合としてエラーを投げる。
        2. `sessionState.inventory.popItemByUid()` で選択中の RocketItem, Launcher, Booster を inventory から抽出する。
        3. 抽出した構成で `Rocket` を生成する。発射角度は最新の AIM 操作で保持した角度を使用し、初期位置はその角度に対応する母星中心から `home.radius + gameBalance.SHIP_START_OFFSET` world px の位置とする。
        4. Launcher / Booster の耐久度を消費する。Booster が `preventsLauncherWear` を持つ場合は Launcher の耐久度消費を免除し、未消耗のまま inventory へ戻す。
        5. 耐久度が残っている発射装備は inventory へ戻す。耐久度が 0 の発射装備は戻さない。
        6. 発射構成の抽出後、`BuildFlowController.resetFlightSelection()` で FLIGHT タブの選択状態を解除し、`WorldRenderer.clearAimRocket()` と `WorldRenderer.clearPredictionPath()` で AIM 中の表示を消去する。
        7. `BuildFlowController.showBuildScreen()` で消費後の inventory と launch button 状態を再描画する。
        8. `launchRocket(rocket)` を呼び出し、生成した `Rocket` を返す。

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
