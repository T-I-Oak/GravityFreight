# Specification: UIController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 表示管理。
- **責務**: 
    - 画面遷移、ダイアログ表示の制御、HUDの制御。
    - UI操作に伴うフィードバック音（決定音等）の再生制御。
    - **DOM イベントの仲介**: HTML 要素のイベント（click等）を購読し、演出を付与した上でシステム側のコールバックを実行する。

## 2. インターフェース (Interface)

### 共通基盤メソッド (Core Infrastructure)

- **`constructor()`**
    - **必要要素**: `#flight-result-screen` を必須の航行結果画面ルートとして取得する。
    - **依存**: `gameDataRepository` と、航行結果画面の HTML を生成する `FlightResultComponents` を使用する。
    - **内部挙動**:
        1. HTML ドキュメント内から各画面のコンテナ要素や、主要なボタン（開始ボタン、開閉ボタン等）を検索し、内部変数に保持する。
        2. Canvas 入力の正規化は `MapInputController` へ委譲する。
        3. **安全性**: 必要な要素が見つからない場合は、初期化エラー（Error）を投げ、不具合を即座に顕在化させる。

- **`setOperationHandler(element: HTMLElement, handler: Function, seId: string = 'click'): void`**
    - 指定された要素にクリックイベントを登録し、指定された操作音を再生した後にハンドラを実行する。
    - **内部挙動**: `addEventListener('click', ...)` を実行し、クリック時に `SoundController.playSE(seId)` を再生してから `handler()` を呼び出す。

- **`setSelectionHandler(element: HTMLElement, dataKey: string, handler: (value: string) => void, seId: string = 'select'): void`**
    - データ属性（`data-XXX`）の取得を伴うクリックイベントを登録する（アイテム選択用）。
    - **内部挙動**: クリック時に `SoundController.playSE(seId)` を再生し、`element.dataset[dataKey]` を引数として `handler` を実行する。

- **`setResizeHandler(handler: (width: number, height: number) => void): void`**
    - ウィンドウのリサイズイベントが発生した際のコールバックを登録する（操作音なし）。
    - **内部挙動**: `window` の `resize` イベントを購読し、発生時に現在のウィンドウサイズを引数として `handler` を実行する。

- **`getMapCanvas(): HTMLCanvasElement`**
    - マップ描画用 Canvas (`#gameCanvas`) を取得する。
    - **内部挙動**: `constructor` で取得済みの DOM 要素を返し、`AppOrchestrator` が `WorldRenderer.initialize()` に渡す。

### 画面制御メソッド (Screen Control)

- **`showTitleScreen(): void`**
    - タイトル画面を表示する。
    - **内部挙動**: タイトル画面を表示し、HUD、ビルドパネル、航行結果画面、施設画面を非表示にする。
- **`showSectorTransitionScreen(): void`**
    - セクター開始ワープ中のプレイ画面を表示する。
    - **内部挙動**: タイトル、航行結果画面、施設画面を非表示にし、プレイ画面と HUD を表示する。セクター生成前またはワープ中は操作対象ではないため、ビルドパネルと発射ボタンは非表示にする。
- **`showRecordScreen(): void`**
    - 記録画面を表示する。
- **`showManualScreen(): void`**
    - 説明書（マニュアル）画面を表示する。
    - **責務境界**: 説明書本体のページ描画、背景画像、ページ切り替え、説明用デモは `HowToPlayUI` が担当する。`UIController` は画面表示の入口または既存画面の非表示制御に留める。
- **`showBuildScreen(viewData?: BuildScreenViewData): void`**
    - ビルドフェーズを開始する。
    - **内部挙動**:
        1. タイトル、航行結果画面、施設画面を非表示にし、HUD とビルドパネルを表示する。
        2. ビルド開始時はビルドパネルをオープン状態にし、以前の画面で付与された折りたたみ状態を解除する。
        3. `viewData` が渡された場合、`rocket`, `launcher`, `booster`, `chassis`, `logic`, `module` の各リストへ `UIComponents.generateCardHTML()` または空表示を反映する。
        4. `viewData.assembly` から ASSEMBLE ボタンの disabled 状態と文言を更新する。
        5. `viewData.launch` から発射ボタンの disabled 状態と文言を更新する。
        6. `rocket` の空表示に `emptyAction: 'open-assembly'` が設定されている場合、その placeholder はクリックで ASSEMBLY タブへ切り替える。
    - **責務境界**: inventory の抽出、選択可否、発射可能判定、UI 文言取得は `BuildScreenPresenter` の責務。`UIController` は渡された view data を DOM に反映する。
- **`showSectorTitle(sectorNumber: number, isAnomaly: boolean): void`**
    - セクター開始時の READY 通知を画面中央に表示する。
    - **内部挙動**:
        1. 通常セクターでは `SECTOR {sectorNumber} READY`、異常セクターでは `ANOMALY SECTOR {sectorNumber} READY` を英語固定で表示する。
        2. `#sector-notification` に `state-active` を付与し、3.5秒の通知アニメーションを実行する。
        3. 異常セクターでは `state-anomaly` を付与し、通常セクターと異なる発光色にする。
        4. 表示終了後は `state-hidden` を戻し、`state-active` / `state-anomaly` を除去する。
- **`setFlightMode(isFlight: boolean): void`**
    - 航行モード（発射後）の切り替えを行い、UI の操作権限を制御する。
    - **内部挙動**:
        - `isFlight: true`: ビルドパネルおよび関連するボタン（ASSEMBLE, LAUNCH等）に対し、特定の CSS クラス（`.state-locked` 等）を付与し、クリックイベントやホバー演出を無効化する。
        - `isFlight: false`: ロックを解除し、再度インタラクティブな状態に戻す。
        - **注意**: HUD およびビルドパネルの表示・非表示はこのメソッドでは変更せず、そのまま維持する。
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
    - **内部挙動**: 内部で保持するメールアイコン要素を引数として `setOperationHandler` を呼び出す。
- **`showStoryModal(content: object): void`**
    - ストーリー（メール）閲覧用のモーダルウィンドウを表示する。
    - **内部挙動**: 
        1. 引数 `content` から `title`, `discovery` (発見状況), `body` (本文) を抽出し、モーダル内の該当する DOM 要素へセットする。
        2. **発見演出**: `discovery` テキストを本文より先に、または強調して表示することで、配送アクションとの繋がりを明示する。
        3. モーダルを表示状態にする。
        4. モーダル内の「閉じる」ボタンに対して、モーダルを閉じるための内部ハンドラを（操作音付きで）自動登録する。
- **`showResultScreen(viewData: FlightResultViewData): void`**
    - 航行結果表示画面（リザルト）へ遷移する。
    - **内部挙動**:
        1. これまで表示されていたビルドパネルを折りたたみ状態にしてからビルドパネルおよび HUD を隠し、リザルト画面のコンテナを表示する。
        2. `FlightResultComponents.generateHTML(viewData, gameDataRepository)` で画面 HTML を生成し、`#flight-result-screen` に反映する。
        3. **ヘッダー・状態表示**: `viewData.status` / `viewData.title` / `viewData.themeClass` に応じ、見出しとテーマカラーを変更する。
        4. **ヒーロー統計 (Hero Stats)**: `viewData.totalScore`, `viewData.totalCoins` を `.Well` 内の強調表示エリアにセットする。
        5. **アクションボタンの動的設定**:
            - **ラベル**: `viewData.actionLabel` を表示する。
            - **カラー**: `viewData.themeClass` に応じたクラスをボタンに付与する。
        6. **明細リスト (Entries) 構築**:
            - `viewData.entries` をループし、**「ラベル」「スコア」「コイン」の 3 列構成**を持つ行要素を生成してコンテナへ追加する。
            - 値が存在しない項目（`score` や `coin` が省略されている場合）は、**空欄**として表示する。
        7. **アイテムリスト (Item Report) 構築**:
            - `viewData.itemReport` をループし、`UIComponents.generateCardHTML` を用いてカードを生成する。
            - 配送成功時（`match`）は、「DELIVERY BONUS」の見出しを伴う専用コンテナ（`.report-bonus-list`）内に獲得したボーナスアイテムを表示する。
        8. **リプレイ状態表示**:
            - `viewData.replay.recorded` / `pending` / `favorite` に基づき、記録済み表示と保護ボタンの状態を更新する。

- **`showGameEndSequence(gameResult: GameResultSummary, gameOver: object): void`**
    - ゲーム終了（契約終了）時の最終画面を表示する。
    - **内部挙動**:
        1. **ゲームオーバー背景**: ゲームオーバー画面を背景として表示し、`gameOver.reason` および **`gameOver.details`（「シャーシ不足」等の具体的な項目リスト）** をメッセージとして表示する。
        2. **ゲームリザルトオーバーレイ**: `gameResult` の累計スコア、総獲得コイン、踏破セクター数、合計航行 Tick 数をまとめたリザルトパネルを前面に表示する。
        3. タイトルへ戻るボタンを表示する。

- **`showFacilityScreen(type: string, data: object): void`**
    - 施設画面（交易所、整備工場、闇市場）を表示する。
    - **内部挙動**:
        1. **画面切り替え**: ビルドパネルを折りたたみ状態にしてから現在の画面を隠し、対象の施設用コンテナを表示する。
        2. **HTML 生成**: `FacilityComponents.generateHTML(data)` で施設画面 HTML を生成し、`#facility-screen` に反映する。
        3. **ヘッダー構築**: `data.name` / `data.icon` / `data.description` / `data.themeClass` を用いて名称、アイコン、説明、施設テーマを表示する。
        4. **リスト構築**: `data.sections[].entries` をループし、`UIComponents.generateCardHTML` を用いて取引候補リストを構築する。
        5. **割引表示**: `entry.discountPercent` > 0 の場合、割引率（例: "20% OFF"）を示すバッジを表示する。
        6. **所持金反映**: `data.coins` を表示エリアにセットする。

- **`updateFacilityCredits(value: number): void`**
    - 施設画面内の所持金表示を即座に更新する。

- **`addFacilityAcquiredItem(item: Item): void`**
    - 整備工場や闇市場で新しく獲得したアイテムを、画面右側の「獲得リスト」に追加表示する。

- **`showSettingsDialog(): void`**
    - 音量設定ダイアログを表示する。
- **`hideSettingsDialog(): void`**
    - 音量設定ダイアログを閉じる。

- **`showStarInfo(body: CelestialBody, point: Vector2): void`**
    - 天体ホバー時の保持アイテムポップアップを表示する。
    - **内部挙動**: `StarInfoPanel.show(body, point, mapCanvas)` へ委譲する。
- **`hideStarInfo(): void`**
    - 天体ホバー表示を非表示にする。
    - **内部挙動**: `StarInfoPanel.hide()` へ委譲する。

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

- **`setStartHandler(handler: Function): void`**
    - タイトル画面の「開始ボタン」にハンドラを登録する。
    - **内部挙動**: 内部で保持する開始ボタン要素を引数として `setOperationHandler` を呼び出す。
- **`setRecordHandler(handler: Function): void`**
    - タイトル画面の「記録ボタン」にハンドラを登録する。
    - **内部挙動**: 内部で保持する記録ボタン要素を引数として `setOperationHandler` を呼び出す。
- **`setManualHandler(handler: Function): void`**
    - タイトル画面の「説明書ボタン」にハンドラを登録する。
    - **内部挙動**: 内部で保持する説明書ボタン要素を引数として `setOperationHandler` を呼び出す。登録されるハンドラは `AppOrchestrator` 経由で `HowToPlayUI.show()` へ接続される。
- **`setBuildPanelHandler(handler: Function): void`**
    - ビルドパネルの「開閉ボタン」にハンドラを登録する。
    - **内部挙動**: 開閉ボタン要素を引数として `setOperationHandler` を呼び出す。

- **`setSettingsCloseHandler(handler: Function): void`**
    - 設定ダイアログの「閉じる（保存）ボタン」にハンドラを登録する。
- **`setSettingsCancelHandler(handler: Function): void`**
    - 設定ダイアログの「キャンセルボタン」にハンドラを登録する。

- **`setVolumeHandler(handler: (value: number) => void): void`**
    - 設定画面の音量スライダー操作時のハンドラを登録する。
    - **内部挙動**:
        1. 内部で保持する音量スライダー要素 (`input[type="range"]`) に対し、以下のイベントを購読する。
        2. **`input` イベント (値の変更通知)**:
            - 操作中に連続して発生。
            - スライダーの現在値を 0.0 〜 1.0 の範囲で取得し、`handler(value)` を実行する。
        3. **`change` イベント (離上時のプレビュー再生)**:
            - スライダーを離した（値が確定した）瞬間に発生。
            - `SoundController.playSE('select', sliderValue)` を実行する。
            - **重要**: `playSE` の第2引数に現在のスライダー値を渡すことで、グローバル音量を変更せずにプレビュー再生を行う。

- **`setBuildItemSelectionHandler(handler: ({ category: string, uid: string }) => void): void`**
    - ビルドパネル内のアイテムカードが選択された際のハンドラを登録する。
    - **内部挙動**:
        1. `.item-list .ItemCard.state-clickable[data-uid]` を対象にクリックイベントを登録する。
        2. カードが属する `#list-{category}` からカテゴリを取得する。
        3. `handler({ category, uid })` を呼び出す。
        4. ビルド画面が再描画された場合も、新しいカードへ再度ハンドラを登録する。

- **`setBuildAssembleHandler(handler: Function): void`**
    - ビルドパネルの「ASSEMBLE ボタン」にハンドラを登録する。
    - **内部挙動**: ASSEMBLE ボタン要素を引数として `setOperationHandler` を呼び出す。ハンドラ実行後、FLIGHT タブへ戻す。

- **`setLaunchHandler(handler: Function): void`**
    - ビルド画面の「LAUNCH ボタン」にハンドラを登録する。
    - **内部挙動**: LAUNCH ボタン要素を対象に `setOperationHandler` を呼び出し、クリック時に登録済み handler を実行する。

- **`setResultHandler(handler: Function): void`**
    - リザルト画面の「確定（OK / CONTINUE）ボタン」にハンドラを登録する。
    - **内部挙動**: ハンドラを保持し、`showResultScreen()` がリザルト画面 DOM を生成した後に次へ進むためのボタンへ `setOperationHandler` を適用する。
    - **注意**: `GameController.start()` 時点ではリザルト画面 DOM が未生成のため、描画前の呼び出しで例外を投げてはならない。

- **`setGameEndReturnHandler(handler: Function): void`**
    - ゲームリザルト画面の「タイトルへ戻る」ボタンにハンドラを登録する。
    - **内部挙動**: ゲーム終了画面内のタイトル復帰ボタン要素を引数として `setOperationHandler` を呼び出す。

- **`setProtectHandler(handler: (protected: boolean) => void): void`**
    - リザルト画面の「レコード保護（PROTECT）ボタン」にハンドラを登録する。
    - **内部挙動**: ハンドラを保持し、`showResultScreen()` がリザルト画面 DOM を生成した後に対象ボタンへ接続する。クリックごとにボタンのトグル状態（`.state-active`）を切り替え、最新の状態を引数として `handler` を実行する。

- **`setMapToggleHandler(handler: (showMap: boolean) => void): void`**
    - リザルト画面の「マップ確認」ボタンにハンドラを登録する。表示文言は UI resource `flightResult.actions.viewMap` を使用する。
    - **内部挙動**: ハンドラを保持し、`showResultScreen()` がリザルト画面 DOM を生成した後に対象ボタンへ接続する。クリック時にリザルトパネルの表示/非表示をトグルし、現在の状態を引数として `handler` を実行する。

- **`setFacilityActionHandler(handler: (action: string, context: object) => void): void`**
    - 施設画面内の各アクションボタン（Buy, Sell, Repair 等）にハンドラを登録する。
    - **内部挙動**: ボタンごとの `data-action` や `data-uid` を抽出し、`handler` を実行する。

- **`setFacilityDepartHandler(handler: Function): void`**
    - 施設画面の「出発（DEPART）ボタン」にハンドラを登録する。
    - **内部挙動**: 出発ボタン要素を引数として `setOperationHandler` を呼び出す。

- **`setCanvasInputHandler(handler: (event: CanvasInputEvent) => void): void`**
    - マップ描画領域（Canvas）に対する入力を中継する（操作音なし）。
    - **内部挙動**: `MapInputController.setHandler(handler)` へ委譲する。
    - **責務境界**: UIController は入力通知先の接続のみを担当する。ブラウザ入力の購読と正規化は `MapInputController`、パン、回転、ズーム、AIM、天体ホバーの意味付けは `GameController` が担当する。
    - **注記**: 対象となる Canvas 要素の取得方法は、`WorldRenderer` の初期化仕様に準拠する。
