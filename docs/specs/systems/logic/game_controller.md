# Specification: GameController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: ゲームプレイ進行の執行者。
- **責務**:
    - **ゲーム内遷移の統括**: ワープ演出、ビルド画面、航行画面、リザルト画面、および**各施設画面**の遷移制御。
    - **ゲーム内入力の処理**: ビルドパネル操作、Canvas 入力（パン・回転・AIM）、および**施設内取引ボタン**の処理。
    - **ロジックの実行**: セクター生成、航行開始、物理計算サービスの呼び出し、終了判定。
    - **表示データ生成の委譲**: ビルド画面の inventory 表示データは `BuildScreenPresenter`、航行結果 view data は `FlightResultViewDataFactory`、共有用 map data は `ShareMapViewDataFactory` へ委譲し、`GameController` は現在状態を渡して進行を制御する。
    - **入力補助の委譲**: Canvas 入力の意味付けは `MapInteractionController`、チュートリアル用 canvas target / focus bounds の解決は `TutorialCanvasTargetResolver` へ委譲する。

## 2. インターフェース (Interface)

### プロパティ (Properties)

- **`currentSector: Sector | null`**: 現在滞在しているセクターのデータインスタンス。
- **`currentRocket: Rocket | null`**: 現在組み立て済み、または航行中のロケットインスタンス。
- **`trajectoryPredictor: TrajectoryPredictor`**: AIM 中の予測軌道計算に使用するサービス。

### メソッド (Methods)

- **`constructor(infrastructure: object)`**
    - `AppOrchestrator` から渡される共通基盤（UI, Renderer, Sound, Data, Services 等）への参照を保持する。
    - `BuildScreenPresenter` を保持し、ビルド画面表示用 view data 生成に使用する。
    - `LaunchSelectionFactory` を保持し、FLIGHT タブの選択状態から航行用 `Rocket` を生成する。
    - `FlightResultViewDataFactory`、`ShareMapViewDataFactory`、`TutorialCanvasTargetResolver` を保持し、それぞれ航行結果 view data、共有 map data、チュートリアル canvas 座標解決に使用する。

- **`start(): void`**
    - ゲームを開始する。
    1. **ステート初期化**: `sessionState.initialize()` を実行。
    2. **前回表示の破棄**: `currentSector` と初回セクター遷移フラグをリセットし、`WorldRenderer.clearSector()` で前回ゲームのマップを消す。
    3. **ゲーム内ハンドラ登録**: `uiController` を介して、ビルドパネル操作、アセンブル、ローンチ、Canvas 入力、航行結果のマップ確認、航行結果のリプレイ保護、施設操作、ゲーム終了画面のタイトル復帰、および**メールアイコン押下**のハンドラを登録する。ビルドアイテム選択は `BuildFlowController.handleItemSelection()` へ、ローンチボタン操作は `launchSelectedRocket()` へ委譲する。ビルドアイテム選択後は、AIM 可能状態であれば予測軌道を再計算する。
    4. **HUD初期化**: `uiController.initHUD(sessionState)` を実行し、初期値（Coins, Sector 等）の表示と、メールスロットのリセット（全ロック）を行う。
    5. **最初のセクターへ**: `this.beginSectorTransition()` を実行。

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
            - Trading Post の売却候補はビルドパネルと同じカテゴリ順 (`rocket`, `launcher`, `booster`, `chassis`, `logic`, `module`) で section を分け、各 section はカテゴリ名のみのヘッダーを持つ。サブテキストは付けない。
        - Repair Dock は、所持している全 launcher の修理候補と、現在の RocketItem の分解候補を表示用データへ変換する。最大耐久度まで回復済みの launcher は disabled とする。
            - Black Market は、100c / 500c 取引メニューを表示用データへ変換する。
            - 施設入場時に、その滞在中の獲得アイテム表示と Black Market 購入済み状態をリセットする。
            - 施設画面の説明、セクション名、ボタン名、空表示文言は `GameDataRepository.getUiText()` で UI resource から取得する。
        2. **表示制御**: `uiController.showFacilityScreen(type, data)` を実行。
        3. **ハンドラ登録**: `uiController` を通じて、施設内ボタン（Buy, Sell, Repair 等）と `handleFacilityAction` を紐付ける。
    - Trading Post の販売在庫は入場時に生成し、取引後の再表示では同じ在庫状態を使用する。
    - Repair Dock の表示データは、左カラムに `repair` と `dismantle`、右カラムに `received` を配置する2カラム構造とする。

- **`handleFacilityAction(action: string, context: object): void`**
    - 施設内での具体的な操作を処理する。
    - **内部挙動**:
        - Trading Post の `buy`: 入場時に生成した販売在庫から対象 item を取得し、購入価格と取得 item を含む `TransactionResult` を作成する。取引成功後は販売在庫から対象 item を除外する。
        - Trading Post の `sell`: inventory stack から売却対象 item を取得し、査定額と削除 item を含む `TransactionResult` を作成する。売却は所持金不足と無関係に操作可能とする。
        - Repair Dock の `repair`: 指定された launcher を取得し、`EconomySystem.createRepairTransaction()` が返す `TransactionResult` を使用する。
        - Repair Dock の `dismantle`: 現在の RocketItem を対象に `EconomySystem.createDismantleTransaction()` が返す `TransactionResult` を使用する。取引成功後は **`this.currentRocket = null`** を実行し、同一滞在中の解体回数を更新する。
        - Black Market の `buy_normal` / `buy_premium`: `EconomySystem.drawBlackMarketGacha()` が返す `TransactionResult` を使用する。同一施設滞在中の購入は1回までとし、購入後は両メニューを disabled にする。
        - 作成した `TransactionResult` は `sessionState.applyTransaction(transaction)` へ渡す。支払い、item 追加・削除、施設固有の `onCommit` callback 実行は `SessionState` 側で一括反映する。
        - `applyTransaction()` が返す `TransactionDelta` を `GameRecordTracker` へ反映し、更新された記録キーを指定して `AchievementTracker.evaluateAchievements({ source: 'game_record', keys })` を呼び出す。
        - 取引後は `TransactionDelta.acquiredItems` をその施設滞在中の獲得アイテム表示へ追加し、同じ施設の表示データを再生成して画面を更新する。
        - 施設画面の再生成時、フッターの coin 表示は取引前の値で描画し、その後 `UIController.updateFacilityCredits()` に取引後の値を渡してカウントアップ/カウントダウンさせる。再生成後の操作判定に使う `currentFacilityViewData` は取引後の値を保持する。
        - HUD の coin 表示は取引後の `SessionState.coins` を即時反映する。

- **`refreshCurrentView(): BuildScreenViewData | FacilityViewData | null`**
    - 言語設定など、表示リソースが切り替わったときに現在画面を再生成する。
    - 施設滞在中は `FacilityFlowController.refreshView({ collapseBuildPanel: false })` を呼び、施設 view data と read-only build panel の表示を現在リソースで再生成する。
    - 施設外では `BuildFlowController.showBuildScreen()` を呼び、ビルドパネル内の item card と操作ラベルを現在リソースで再生成する。
    - 再生成後、必要な操作ハンドラを再登録し、AIM 可能状態であれば予測線を再計算する。

- **`leaveFacility(): void`**
    - 施設を出発し、次セクターへ向かう。
    - **内部挙動**:
        1. `checkGameOverAndStartEndSequence()` を実行する。
        2. ゲームオーバーでない場合、退場元施設が Black Market なら `SessionState.recordBlackMarketVisit()` を実行する。
        3. `this.beginSectorTransition()` を実行。
        4. ※ 次セクター生成時に `Sector` インスタンスが新しくなるため、割引率は自動的に 0 にリセットされる。
    - セクター進行と契約終了判定の具体処理は `SectorProgressionController` に委譲する。

- **`checkGameOverAndStartEndSequence(): boolean`**
    - 航行結果確定後および施設退出時に共通利用するゲームオーバー判定フロー。
    - 実処理は `SectorProgressionController.checkGameOverAndStartEndSequence()` へ委譲する。
    - **内部挙動**:
        1. `EconomySystem.checkGameOver(sessionState)` を実行する。
        2. 戻り値が `null` の場合は `false` を返す。
        3. ゲームオーバー結果が返った場合は、ゲームリザルト表示用の `GameResultSummary` を `sessionState.getGameResultSummary()` で取得する。
        4. `GameRecordTracker.recordGameResult(gameResult)` を呼び出し、契約完了回数など契約終了時にのみ確定する記録値を更新する。
        5. `RankTracker.recordGameResult(gameResult)` を呼び出し、ゲーム1プレイ単位のランキング・推移記録へ反映する。
        6. `AchievementTracker.evaluateAchievements({ source: 'game_record', keys: ['lifetime_contracts'] })` を呼び出し、新規到達 tier があれば UI 通知へ渡す。
        7. `worldRenderer.startWarpEffect(3200, { direction: 'reverse' })` で現在セクターから離脱する逆方向ワープを開始する。
        8. `uiController.showGameEndSequence(gameResult, gameOver)` を実行し、`true` を返す。
    - ランキング登録はゲーム終了画面へ遷移する確定タイミングでのみ行い、契約が継続する航行終了・施設退出では行わない。

- **`returnToTitle(): void`**
    - ゲーム終了画面のタイトル復帰操作を処理する。
    - **内部挙動**: ゲームオーバー退場ワープを減速させてから `AppOrchestrator.returnToTitle()` へ制御を戻し、Game Lifecycle の終了を委譲する。

- **`handleResultMapToggle(showMap: boolean): void`**
    - 航行結果画面の `VIEW MAP` 表示状態変更を受け取る。
    - **内部挙動**:
        - `showMap === true` のとき、`WorldRenderer.render()` を呼び出して最終航行状態のマップを再描画する。
        - `showMap === false` のとき、ゲーム状態は変更しない。
    - **責務境界**: 結果画面と戻りボタンの表示切替は `UIController` が担当し、`GameController` はマップ描画要求だけを担当する。

- **`getFavoriteReplayRecords(): FlightRecord[]`**
    - 航行結果画面の replay 保護上限ダイアログに表示する候補を返す。
    - `FlightRecorder.getRecords()` から `favorite === true` の記録だけを抽出する。
    - **責務境界**: 候補表示の DOM 生成は `FlightResultScreenView`、保護状態の永続管理は `FlightRecorder` が担当する。

- **`handleResultProtect(favorite: boolean, options?: { replaceRecordId?: string }): FlightRecord | null`**
    - 航行結果画面のリプレイ保護状態変更を受け取る。
    - **内部挙動**:
        1. `options.replaceRecordId` が指定された場合は、先に `FlightRecorder.setFavorite(replaceRecordId, false)` を呼び出して既存の protected replay を解除する。
        2. 航行記録が自動保存済みの場合は、直近の `FlightRecord.id` を指定して `FlightRecorder.setFavorite(id, favorite)` を呼び出す。
        3. 航行記録が自動保存されず pending 状態であり、`favorite === true` の場合は `FlightRecorder.savePendingRecordAsFavorite()` を呼び出す。
        4. 保存済みまたは保存された `FlightRecord` を `lastReplayRecord` として保持する。
    - **責務境界**: お気に入り上限や pending 記録の永続化判断は `FlightRecorder` の責務。`GameController` は航行結果画面操作と `FlightRecorder` の該当 API を接続する。

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
        7. プレビュー用 `Rocket` の初速は `Rocket.getInitialVelocity(sessionState.returnBonus)` で算出し、同一セクター内の帰還ボーナスを AIM 予測へ反映する。
        8. `TrajectoryPredictor.predictPath(previewRocket, currentSector)` の結果から `actualTrail` を取り出し、発射位置を先頭に加えた座標列を `WorldRenderer.setPredictionPath()` へ渡す。AIM 可能状態の間、予測線は常に表示対象とする。AIM 可能状態で `actualTrail` が空になる場合は、予測計算またはパーツ性能定義の不整合として扱い、代替線で隠蔽しない。
        9. `hover` は `CameraController.toWorld()` でワールド座標へ変換し、`CelestialBody` の半径に `mapConstants.STAR_HIT_MARGIN` を加味して対象天体を判定する。対象天体が item を保持している場合のみ `UIController.showStarInfo(body, displayPoint)` を呼び出し、それ以外は `UIController.hideStarInfo()` を呼び出す。`hoverleave` では必ず非表示にする。
        10. `pointerType: "touch"` の `pointerdown` が item を保持する天体、または配送 cargo の exit arc アイコン上で発生した場合は、PC の hover 相当として情報パネルを表示する。この場合は同じ pointerdown を pan / rotate / AIM としては処理しない。
    - **責務境界**: ブラウザイベントの購読や2本指入力の正規化は `UIController`、座標変換・パン・回転・ズームの実計算は `CameraController`、描画更新は `WorldRenderer` の責務とする。

- **`beginSectorTransition(): Promise<void>`**
    - セクター間の遷移（ワープ演出）シーケンスを統括する。
    - ワープ演出の時間制御は `SectorTransitionAnimator` に委譲する。
    - セクター生成、セクター開始時記録、HUD / Renderer 更新は `SectorProgressionController.beginSectorTransition()` へ委譲する。
    1. **演出制御**: 背景・描画・音のワープ演出を開始。
        - ワープ演出の開始時点では、`currentSector` は前セクターのままとし、前セクターのマップへズームインして加速する演出を行う。
        - 新規ゲームの最初のワープでは前回ゲームの `currentSector` を引き継がず、開始時点でマップを表示しない。
        - 演出途中で遠方から次セクターのマップが現れるタイミングで、新しい `Sector` を生成して `currentSector` を切り替える。
    2. **ロジック更新**: 
        - 次セクター生成時に `sessionState.sectorNumber` を更新。
        - **`this.currentSector = new Sector(sessionState, isAnomaly)`** を実行して新マップを生成。
        - `SessionState.reachedSector` が更新された場合は、`GameRecordTracker.recordSectorStart(sessionState)` を呼び出し、`AchievementTracker.evaluateAchievements({ source: 'game_record', keys: ['max_reached_sector'] })` を呼び出す。
    3. **同期**: HUDの数値表示（セクター番号等）を最新状態に更新し、`worldRenderer` への新マップセット、セクタータイトル表示を行う。
        - セクター到達時の特殊ストーリーが有効な場合、`SectorProgressionController.beginSectorTransition()` へ `sectorTitleType: 'home'` を渡し、セクター開始表示を `HOME SECTOR {sectorNumber} READY` にする。
        - 特殊ストーリーが表示された場合、表示後に `StorySystem.updateReadStatus(storyId)` を呼び出して既読化し、`AchievementTracker.evaluateAchievements({ source: 'story_read', keys: ['total'] })` を呼び出す。`HOME25` は T/R/B 系列別実績には含めないため、評価キーは `total` のみとする。
    4. **演出終了**: 各演出の完了後に `uiController.setFlightMode(false)` で操作ロックを解除し、`BuildFlowController.showBuildScreen()` を実行する。ビルドパネルはワープ演出中には表示せず、このタイミングで初めて表示する。

- **`launchRocket(rocket: Rocket, angle: number): void`**
    - 航行シーケンスを開始する。
    - **内部挙動**:
        1. **発射状態の確定**: `Rocket.getInitialVelocity(sessionState.returnBonus)` で初速を算出し、`rocket.velocity` へ反映する。これにより、同一セクター内の母星帰還で蓄積された発射パワーボーナスを実航行に適用する。
        2. **発射時 snapshot 記録**: 発射角度、初速、発射構成、セクター状態が確定した直後に `FlightRecorder.captureLaunchSnapshot(rocket, currentSector)` を呼び出す。
        3. **UIモード遷移**: `uiController.setFlightMode(true)` を実行し、ビルドパネルをロックする。
        4. **描画開始**: `worldRenderer.startNavigation(rocket)` を実行。
        5. **ソナー開始**: `worldRenderer.enableSonar()` を実行し、波紋の生成を継続する（AIM状態から継続）。
        6. **ループ開始**: `NavigationLoopController.start({ rocket, sector: currentSector, onNavigationEnd })` を呼び出し、航行更新ループを開始する。

- **`launchSelectedRocket(): Rocket`**
    - FLIGHT タブで選択済みの発射構成から `Rocket` を生成し、`launchRocket()` へ渡す。
    - **内部挙動**:
        1. `LaunchSelectionFactory.createRocketFromSelection()` を呼び出す。
        2. `LaunchSelectionFactory` は `BuildFlowController.currentBuildSelection` から `rocket`, `launcher`, `booster` の stack uid を取得する。`rocket` と `launcher` が未選択のまま呼び出された場合は UI 状態とロジック状態の不整合としてエラーを投げる。
        3. `LaunchSelectionFactory` は `sessionState.inventory.popItemByUid()` で選択中の RocketItem, Launcher, Booster を inventory から抽出し、最新の AIM 角度と母星からの発射位置で `Rocket` を生成する。
        4. `LaunchSelectionFactory` は Launcher / Booster の使用状態を反映する。Booster が `preventsLauncherWear` を持つ場合は Launcher の耐久度消費を免除し、Launcher は inventory へ戻す。
        5. `maxCharges > 0` の発射装備は耐久度を減算し、耐久度が残っている場合のみ inventory へ戻す。`maxCharges` を持たない Booster は1回限りの消耗品として扱い、使用後は inventory へ戻さない。
        6. `LaunchSelectionFactory` は発射構成の抽出後、`BuildFlowController.resetFlightSelection()` と `BuildFlowController.showBuildScreen()` を呼び出し、消費後の inventory と launch button 状態を再描画する。
        7. `GameController` は生成された `Rocket` を `launchRocket(rocket)` へ渡し、その `Rocket` を返す。

- **航行更新ループ**
    - 航行中の物理更新、HUD 更新、終了判定の監視は `NavigationLoopController` へ委譲する。
    - `GameController` は航行開始時の状態確定と、`handleNavigationEnd()` による航行終了後の進行処理を担当する。

- **`handleNavigationEnd(result: object): Promise<void>`**
    - 航行フェーズの終了処理（報酬計算、演出実行、画面遷移）を統括する。
    - **内部挙動**:
        1. **ループ停止**: `NavigationLoopController.stop()` を呼び出し、航行更新ループを停止する。
        2. **成果データの確定**:
            - `const flightData = currentRocket.getFlightResult()` を取得。
            - `const settlement = EconomySystem.calculateSettlement(result, flightData, sessionState)` を実行。
        3. **状態反映（アトミック）**:
            - `sessionState.applySettlement(settlement)` を実行し、資産を確定させる。
            - **物語解放**: `settlement.unlockedBranchId` が存在する場合、その ID を用いて `StorySystem.unlockNextStep(id)` を実行する。
            - **リプレイ記録**: 航行単位のリプレイ記録は、この航行終了処理内で `FlightRecorder.recordFlightResult(resultContext)` を呼び出して確定する。`resultContext` には航行終了時メタ情報のみを含め、発射時 snapshot は `FlightRecorder` が保持している `pendingRecordDraft` を使用する。
            - **実績記録**: 航行終了時点で `GameRecordTracker.recordFlightResult(resultContext)` を必ず呼び出す。その後、航行終了時に更新された記録キーを指定して `AchievementTracker.evaluateAchievements({ source: 'game_record', keys })` を呼び出し、新規到達 tier があれば UI 通知へ渡す。
            - **共有用マップ情報**: `ShareMapViewDataFactory.create({ sector, rocket })` を呼び出し、航行結果画面の `viewData.shareMap` に航行終了時点の sector body / exit arc / exit facility name / rocket trail / rocket final position / velocity を純データとして含める。共有画像ではこのデータを使い、通常画面とは別に薄く残る航跡、到着地点のロケット、施設名を描画する。
            - **配送実績記録**: `settlement.deliveryCount > 0` の場合は `GameRecordTracker.recordDeliverySuccess({ count: settlement.deliveryCount, currentContractDeliveries: sessionState.totalDeliveries })` を呼び出し、累積配達数と1契約内最高配達数を更新する。返却された記録キーは航行終了時の実績判定キーに合流させる。
        4. **演出開始**:
            - `worldRenderer.disableSonar()`。
            - `uiController.playFlightEndSE(settlement.status)` を実行し、航行終了種別に対応する SE を再生する。
            - `worldRenderer.playFinishAnimation(result)` を実行。
        5. **演出完了待機**: `await` により演出完了を待機する。
        6. **画面遷移**:
            - `FlightResultViewDataFactory.createViewData()` で、`settlement`、リプレイ保存状態、実績通知、ストーリー状態から航行結果表示用 view data を生成する。
            - 航行結果タイトルと遷移ボタン文言は `GameDataRepository.getUiText()` で UI resource から取得する。セクター番号や施設名が必要な文言は取得後に `{sector}` / `{facility}` を置換する。
            - `uiController.showResultScreen(viewData)` を呼び出す。

- **`handleMailClick(index: number): void`**
    - 指定されたインデックス（0〜2）のメールボタンがクリックされた際の処理。
    - **内部挙動**:
        1. **状況確認**: `StorySystem.getStoryStatus()[index]` から対象の物語 ID を取得する。
        2. 対象 ID を `handleStoryOpen(storyId)` へ渡す。
- **`handleStoryOpen(storyId: string): object | null`**
    - HUD のメールアイコン、または航行結果画面のストーリーカードから呼ばれる共通のストーリー閲覧処理。
    - **内部挙動**:
        1. `StorySystem.getStoryStatus()` から対象のストーリー状態とスロット index を取得する。
        2. `uiController.showStoryModal(storyId)` を実行する。
        3. 対象が未読の場合のみ `StorySystem.updateReadStatus(storyId)` を実行し、`AchievementTracker.evaluateAchievements({ source: 'story_read', keys: ['total', type] })` を呼び出す。
        4. 新規到達 tier があれば `uiController.showAchievementToasts(events)` へ渡す。
        5. 該当スロットの未読明滅を停止させるため、更新後の状態で `uiController.updateMailStatus(index, type, isUnread)` を呼び出す。
        6. 対象ストーリーが現在の story status に存在しない場合は何もせず `null` を返す。
