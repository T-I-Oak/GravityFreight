# Specification: UIController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 表示管理。
- **責務**: 
    - 画面遷移、ダイアログ表示の制御、HUDの制御。
    - UI操作に伴うフィードバック音（決定音等）の再生制御。
    - **DOM イベントの仲介**: HTML 要素のイベント（click等）を購読し、演出を付与した上でシステム側のコールバックを実行する。
    - ビルドパネル表示は `BuildPanelView`、航行結果画面表示は `FlightResultScreenView`、記録画面表示は `ArchiveDialogView`、HUD 表示は `HudView`、ストーリーモーダルは `StoryModalView`、achievement toast は `AchievementToastView` へ委譲する。

## 2. インターフェース (Interface)

### 共通基盤メソッド (Core Infrastructure)

- **`constructor()`**
    - **依存**: `gameDataRepository`, `BuildPanelView`, `FlightResultScreenView`, `ArchiveDialogView`, `ReplayProtectFlow`, `SettingsDialogView`, `StarInfoPanel`, `HudView`, `StoryModalView`, `AchievementToastView`, `UIOperationBinder`, `FacilityCreditCounter`, `UIShareCoordinator`, `ShareImageRenderer`, `ShareService` を使用する。
    - **内部挙動**:
        1. HTML ドキュメント内から各画面のコンテナ要素や、主要なボタン（開始ボタン、開閉ボタン等）を検索し、内部変数に保持する。
        2. Canvas 入力の正規化は `MapInputController` へ委譲する。
        3. ビルドパネル固有の DOM 取得・イベント登録は `BuildPanelView`、航行結果画面固有の DOM 取得・イベント登録は `FlightResultScreenView`、replay protect 共通フローは `ReplayProtectFlow` へ委譲する。
        4. **安全性**: 必要な要素が見つからない場合は、初期化エラー（Error）を投げ、不具合を即座に顕在化させる。

- **`setOperationHandler(element: HTMLElement, handler: Function, seId: string = 'click'): void`**
    - 指定された要素にクリックイベントを登録し、指定された操作音を再生した後にハンドラを実行する。
    - **内部挙動**: `UIOperationBinder.bind(element, handler, seId)` へ委譲する。binder は disabled / `state-disabled` の要素では handler を呼ばず、操作音再生後に `handler(element, event)` を呼び出す。

- **`setSelectionHandler(element: HTMLElement, dataKey: string, handler: (value: string) => void, seId: string = 'select'): void`**
    - データ属性（`data-XXX`）の取得を伴うクリックイベントを登録する（アイテム選択用）。
    - **内部挙動**: クリック時に `SoundController.playSE(seId)` を再生し、`element.dataset[dataKey]` を引数として `handler` を実行する。

- **`setResizeHandler(handler: (width: number, height: number) => void): void`**
    - ウィンドウのリサイズイベントが発生した際のコールバックを登録する（操作音なし）。
    - **内部挙動**: `window` の `resize` イベントを購読し、発生時に現在のウィンドウサイズを引数として `handler` を実行する。

- **`getMapCanvas(): HTMLCanvasElement`**
    - マップ描画用 Canvas (`#gameCanvas`) を取得する。
    - **内部挙動**: `constructor` で取得済みの DOM 要素を返し、`AppOrchestrator` が `WorldRenderer.initialize()` に渡す。

- **`getTitleCanvases(): { background: HTMLCanvasElement, foreground: HTMLCanvasElement }`**
    - タイトル画面演出用 Canvas (`#title-bg-canvas`, `#title-fg-canvas`) を取得する。
    - **内部挙動**: `constructor` で取得済みの DOM 要素を返し、`AppOrchestrator` が `TitleScreenAnimator.initialize()` に渡す。
    - **責務境界**: Canvas への描画、animation frame の制御、共有 `BackgroundManager` の更新は `TitleScreenAnimator` の責務であり、`UIController` は DOM 要素の提供に留める。

### 画面制御メソッド (Screen Control)

- **`showTitleScreen(): void`**
    - タイトル画面を表示する。
    - **内部挙動**: タイトル画面を表示し、HUD、ビルドパネル、航行結果画面、施設画面を非表示にする。
    - **表示要素**: タイトルロゴは `logo.svg` を使用する。背景画像は使用せず、星背景およびロケット周回演出は `TitleScreenAnimator` が Canvas へ描画する。
- **`showSectorTransitionScreen(): void`**
    - セクター開始ワープ中のプレイ画面を表示する。
    - **内部挙動**: タイトル、航行結果画面、施設画面を非表示にし、プレイ画面と HUD を表示する。セクター生成前またはワープ中は操作対象ではないため、ビルドパネルと発射ボタンは非表示にする。
- **`showRecordScreen(viewData: ArchiveViewData, options?: { activeTab?: string }): void`**
    - 記録画面を表示する。
    - **内部挙動**:
        1. `ArchiveDialogView.show(viewData, ArchiveComponents, options)` へ委譲する。
        2. `ArchiveComponents` が生成した HTML を Archive overlay に表示する。
        3. `options.activeTab` が指定された場合は、Archive の初期表示タブとして使用する。
    - **責務境界**: Archive 表示用 view data の生成は `ArchiveScreenPresenter` が担当する。`UIController` は表示先と共通操作配線の入口だけを持つ。
- **`hideRecordScreen(): void`**
    - 記録画面を非表示にする。
    - **内部挙動**: `ArchiveDialogView.hide()` へ委譲する。
- **`showManualScreen(): void`**
    - 説明書（マニュアル）画面を表示する。
    - **責務境界**: 説明書本体のページ描画、背景画像、ページ切り替え、説明用デモは `HowToPlayUI` が担当する。`UIController` は画面表示の入口または既存画面の非表示制御に留める。
- **`showBuildScreen(viewData?: BuildScreenViewData): void`**
    - ビルドフェーズを開始する。
    - **内部挙動**:
        1. タイトル、航行結果画面、施設画面を非表示にし、HUD とビルドパネルを表示する。
        2. `BuildPanelView.show(viewData)` を呼び出し、ビルドパネル固有の DOM 反映を委譲する。
    - **責務境界**: inventory の抽出、選択可否、発射可能判定、UI 文言取得は `BuildScreenPresenter` の責務。ビルドパネル内の DOM 反映は `BuildPanelView` の責務。`UIController` は画面全体の表示切替を担当する。
- **`showSectorTitle(sectorNumber: number, isAnomaly: boolean, options?: { type?: 'default' | 'home' }): void`**
    - セクター開始時の READY 通知を画面中央に表示する。
    - **内部挙動**:
        1. 通常セクターでは `SECTOR {sectorNumber} READY`、異常セクターでは `ANOMALY SECTOR {sectorNumber} READY` を英語固定で表示する。
        2. 特殊ストーリー到達などにより `options.type === 'home'` が指定された場合は、異常セクター判定よりも優先して `HOME SECTOR {sectorNumber} READY` を表示する。
        3. `#sector-notification` に `state-active` を付与し、3.5秒の通知アニメーションを実行する。
        4. 異常セクターでは `state-anomaly` を付与し、通常セクターと異なる発光色にする。
        5. 表示終了後は `state-hidden` を戻し、`state-active` / `state-anomaly` を除去する。
- **`showAchievementToasts(events: AchievementTierReached[]): void`**
    - achievement tier 到達イベントを画面上部のトーストとして表示する。
    - **内部挙動**:
        1. `AchievementTierReached.achievementId` から `GameDataRepository.getAchievementDefinition()` で実績定義を取得する。
        2. Analytic Archive の achievement card と同じ `AchievementCard` 構造で、到達 tier の title、実績 label、到達時の値、今回達成した tier 目標値までの進捗を表示する。
            - 記録画面の achievement card は次 tier までの進捗を表示するが、toast は達成通知として表示するため分母を今回達成した tier の目標値にする。
        3. 表示中のトーストには `achievementId`、到達 tier、到達時の値を保持し、言語切り替え時に現在言語の実績定義で再描画する。
        4. トーストは system toast の z-index レイヤーに表示し、一定時間後に自動で消す。
    - **責務境界**: 到達判定は `AchievementTracker` が担当する。`UIController` は渡された到達イベントの表示だけを担当し、通知済み状態は保存しない。
- **`setFlightMode(isFlight: boolean): void`**
    - 航行モード（発射後）の切り替えを行い、UI の操作権限を制御する。
    - **内部挙動**: `BuildPanelView.setFlightMode(isFlight)` へ委譲する。
    - **注意**: HUD およびビルドパネルの表示・非表示はこのメソッドでは変更せず、そのまま維持する。
- **`playFlightEndSE(status: string): void`**
    - 航行終了種別に対応する SE を再生する。
    - **内部挙動**:
        - `cleared` は `flight-exit`、`returned` は `flight-return`、`crashed` は `flight-crash`、`lost` は `flight-lost` を `SoundController.playSE()` へ渡す。
        - 未定義の `status` では何も再生しない。
- **`initHUD(sessionState: object): void`**
    - 契約（ゲーム）開始時に HUD を初期化する。
    - **内部挙動**: 
        1. `sessionState` から初期値（Coins, Sector 等）を取得し、DOM に即座に反映する。
        2. **メールスロットのリセット**: 全 3 スロットのメールアイコンから施設 type クラス、`.state-new`、`.state-clickable` を除去し、`.state-disabled` に戻す。
- **`updateHUDValue(key: string, value: number): void`**
    - 航行画面が表示されている間、HUD 内の特定の数値（スコア等）を更新する。
    - **内部挙動 (ロールカウンター演出)**:
        1. **目標値 (`targetValue`) の保持**: 引数の `value` を目標値として保持する。
        2. **内部表示値 (`internalValue`) の補間更新**: 
            - 毎フレーム、現在保持している内部数値（浮動小数点数）を目標値に向けて補間する。
            - 補間式: `internalValue += (targetValue - internalValue) * 0.2`
            - **差の絶対値**が 1 未満になった時点で、`internalValue = targetValue` とし補間を終了する。
        3. **表示への反映 (DOM 更新)**:
            - **整数化**: `internalValue` を `Math.floor()` 等で整数に丸める。
            - **フォーマット**: 整数化された数値に 3 桁ごとのカンマを挿入する（例: `1,234`）。
            - **反映**: フォーマット済みの文字列を DOM のテキストとして書き込む。
- **`updateMailStatus(index: number, type: string, isUnread: boolean): void`**
    - 指定されたインデックス（0〜2）のメールアイコンの状態（種類に応じた色、未読時の明滅演出）を更新する。
    - **内部挙動**:
        - **状態更新**: `type` が存在すれば `.state-disabled` を除去し、必要に応じて `.state-clickable` を付与する。
        - **色の更新**: `type`（'T', 'R', 'B'）に基づき、施設 type クラス（例: `.trading-post`, `.repair-dock`, `.black-market`）を切り替える。
        - **未読表示**: `isUnread` が `true` の場合、未読アニメーション用の `.state-new` を付与し、既読になるまで継続させる。
- **`setMailHandler(handler: Function): void`**
    - メールアイコンがクリックされた際のハンドラを登録する。
    - **内部挙動**: 内部で保持するメールアイコン要素ごとに `setOperationHandler` を呼び出し、クリックされたスロット index を handler へ渡す。
- **`showStoryModal(storyId: string): void`**
    - ストーリー（メール）閲覧用のモーダルウィンドウを表示する。
    - **内部挙動**: `StoryModalView.show(storyId)` へ委譲する。
    - **責務境界**: ストーリー本文 HTML の生成、閉じるボタンの接続、表示中 `storyId` に基づく言語切り替え時の再描画は `StoryModalView` が担当する。
- **`setResultStoryHandler(handler: Function): void`**
    - 航行結果画面内のストーリーカードがクリックされた際のハンドラを登録する。
    - **内部挙動**: `FlightResultScreenView` に委譲し、クリックされた `data-story-id` を handler へ渡す。
- **`setArchiveStoryHandler(handler: Function): void`**
    - 記録画面 Story タブ内の既読ストーリーカードがクリックされた際のハンドラを登録する。
    - **内部挙動**: `ArchiveDialogView.setStoryOpenHandler(handler)` に委譲し、クリックされた `data-story-id` を handler へ渡す。
- **`showResultScreen(viewData: FlightResultViewData): void`**
    - 航行結果表示画面（リザルト）へ遷移する。
    - **内部挙動**:
        1. これまで表示されていたビルドパネルを折りたたみ状態にしてからビルドパネルおよび HUD を隠し、リザルト画面のコンテナを表示する。
        2. `FlightResultScreenView.show(viewData)` を呼び出し、航行結果画面固有の HTML 生成・操作接続を委譲する。
        3. 航行結果共有ボタンは `UIShareCoordinator` が保持中の `viewData` と map canvas を `ShareImageRenderer` へ渡し、生成された画像を `ShareService` で共有する。
    - **責務境界**: 航行結果 view data の内容解釈と DOM 生成は `FlightResultComponents` / `FlightResultScreenView` の責務。`UIController` は画面全体の表示切替を担当する。

- **`showGameEndSequence(gameResult: GameResultSummary, gameOver: object): void`**
    - ゲーム終了（契約終了）時の最終画面を表示する。
    - **内部挙動**:
        1. **ゲームオーバー背景**: `WorldRenderer` が現在セクターのマップを維持したまま逆方向ワープを行うため、UI はプレイシーンを背景として表示状態に保つ。
        2. **ゲームリザルトオーバーレイ**: 逆方向ワープ開始から短い遅延を置いて、レシート形式の最終評価パネルを前面に表示する。外側を暗い印刷オーバーレイで覆わず、逆ワープ中の星背景の上に紙面だけを重ねる。
        3. レシートには `SECTORS COMPLETED`、`TOTAL COLLECTED`、`FINAL SCORE` を表示し、それぞれに ranking と grade の詳細行を表示する。
        4. ranking は `gameResult.rankings` の `sectorRank`、`collectedRank`、`scoreRank` を使用する。ランク外または未取得の場合は `OUT OF TOP 20` と表示する。
        5. grade は `gameBalance.GRADE_STEPS` を使用し、セクター数、回収数、スコアの各評価値と、それらを合成した総合評価を算出する。総合 grade はスタンプに表示する。
        6. `gameOver.reason` および `gameOver.details` は終了条件の制御情報であり、スコア ranking / grade の代替としてレシート本文に表示しない。
        7. grade stamp が表示状態に入るタイミングで `SoundController.playSE('stamp')` を実行する。
        8. タイトルへ戻るボタンとして `END CONTRACT` を表示する。
        9. 共有ボタンは `UIShareCoordinator` がレシート DOM を `ShareImageRenderer` へ渡し、生成された画像を `ShareService` で共有する。
        10. `END CONTRACT` 押下時は、登録済みのゲーム終了復帰 handler を呼び出す。handler 側で退場ワープの減速と `AppOrchestrator.returnToTitle()` を実行する。

- **`showFacilityScreen(type: string, data: object): void`**
    - 施設画面（交易所、整備工場、闇市場）を表示する。
    - **内部挙動**:
        1. **画面切り替え**: ビルドパネルを折りたたみ状態にしてから現在の画面を隠し、対象の施設用コンテナを表示する。
        2. **HTML 生成**: `FacilityComponents.generateHTML(data)` で施設画面 HTML を生成し、`#facility-screen` に反映する。
        3. **ヘッダー構築**: `data.name` / `data.icon` / `data.description` / `data.themeClass` を用いて名称、アイコン、説明、施設テーマを表示する。
        4. **リスト構築**: `data.sections[].entries` をループし、`UIComponents.generateCardHTML` を用いて取引候補リストを構築する。
            - Trading Post の売却候補はビルドパネルと同じカテゴリ順 (`rocket`, `launcher`, `booster`, `chassis`, `logic`, `module`) で section を分ける。
            - 売却候補 section のヘッダーはビルドパネルのカテゴリ見出しと同じ形式とし、`ROCKET` などのカテゴリ名だけを表示する。サブテキストは表示せず、カテゴリ class によってカテゴリ色を反映する。
        5. **割引表示**: `entry.discountPercent` > 0 の場合、割引率（例: "20% OFF"）を示すバッジを表示する。
        6. **所持金反映**: `data.coins` を表示エリアにセットする。

- **`updateFacilityCredits(value: number): void`**
    - 施設画面内の所持金表示を、現在表示値から指定値へカウントアップ/カウントダウンして更新する。
    - 航行結果画面の得点・コイン表示と同様に `requestAnimationFrame` で補間し、最終フレームで指定値に揃える。

- **`addFacilityAcquiredItem(item: Item): void`**
    - 整備工場や闇市場で新しく獲得したアイテムを、画面右側の「獲得リスト」に追加表示する。

- **`showSettingsDialog(): void`**
    - 音量設定ダイアログを表示する。
- **`hideSettingsDialog(): void`**
    - 音量設定ダイアログを閉じる。
    - **内部挙動**:
        - `#title-settings-btn` および `#build-settings-btn` のクリックで `#settings-overlay` を表示する。
        - `#settings-done-btn` のクリックで `#settings-overlay` を非表示にする。
        - 設定値は操作時に即時反映・保存されるため、キャンセル用の閉じるボタンは持たない。
- **`configureSettings(config: object): void`**
    - 設定画面の初期値と操作ハンドラを `SettingsDialogView.configure(config)` へ委譲する。
    - `UIController` は SE 音量の保存、カメラ状態の保存、言語設定保存を直接担当しない。

- **`showStarInfo(body: CelestialBody, point: Vector2): void`**
    - 天体ホバー時の保持アイテムポップアップを表示する。
    - **内部挙動**: `StarInfoPanel.show(body, point, mapCanvas)` へ委譲する。
- **`showDeliveryCargoInfo(info: { facilityType: string, itemId: string }, point: Vector2): void`**
    - 配送 cargo の arc アイコン hover 時に、配送先案内を表示する。
    - **内部挙動**:
        1. `facilityType` から施設名を解決する。
        2. `itemId` から現在言語の item 名を解決する。
        3. UI text `map.deliveryCargo.title` / `map.deliveryCargo.body` を使い、item 名と施設名を差し込む。
        4. `StarInfoPanel.showMessage()` へ委譲する。
    - 表示名文字列を呼び出し元から受け取って保持してはならない。言語切り替え後に古い item 名を残さないため、保持するのは `facilityType`、`itemId`、表示位置とする。
- **`hideStarInfo(): void`**
    - 天体ホバー表示を非表示にする。
    - **内部挙動**: `StarInfoPanel.hide()` へ委譲する。
- **`refreshLanguageDependentUI(): void`**
    - 設定画面で言語が切り替えられたとき、`UIController` が保持している表示中の UI 断片を現在の言語で再描画する。
    - **内部挙動**:
        1. ストーリーモーダルを表示中の場合は、`StoryModalView.refreshLanguage()` へ委譲する。
        2. アチーブメント達成トーストを表示中の場合は、`AchievementToastView.refresh()` へ委譲する。
        3. 配送 cargo の hover 案内を表示中の場合は、保持している `facilityType` / `itemId` / `point` から `showDeliveryCargoInfo()` を再実行し、item 名と UI text を現在言語で再取得する。
        4. 天体 item popup を表示中の場合は、`StarInfoPanel.refreshCurrent()` へ委譲し、表示中 item の `getViewData()` を再取得する。
    - **責務境界**: ビルドパネル、施設画面など現在の画面全体の再描画は `GameController.refreshCurrentView()` 側が担当する。`UIController` は自身が一時保持している modal / toast / hover / popup 表示のみを更新する。航行結果画面とゲームオーバー画面は表示中に設定ボタンを表示しないため、通常操作での言語切り替え対象外とする。

### ビルドパネル制御 (Build Panel Control)

- **`openBuildPanel(): void`**
    - ビルドパネルを開く。
    - **内部挙動**: パネル要素に特定の CSS クラス（`.state-active` 等）を付与し、アニメーションを実行する。
- **`closeBuildPanel(): void`**
    - ビルドパネルを閉じる。
    - **内部挙動**: パネル要素から CSS クラスを除去し、アニメーションを実行する。
- **`toggleBuildPanel(): void`**
    - ビルドパネルの表示/非表示を切り替える。
    - **内部挙動**: 内部で保持するパネルの表示フラグ（isOpen）を確認し、`openBuildPanel()` または `closeBuildPanel()` のいずれかを呼び出す。

- **ビルドタブ切替**
    - `data-tab="flight"` / `data-tab="assembly"` を持つタブ操作により、`#tab-flight` / `#tab-assembly` の表示状態を切り替える。
    - **責務境界**: タブ切替は表示上のカテゴリ切替のみであり、ビルド選択状態、inventory、RocketItem は変更しない。

### イベント登録メソッド (Event Registration)

UIController が外部へ公開するイベント登録 API は、[UIController Event Registration](./ui_controller_event_registration.md) に分割して定義する。
