# Specification: UIController Event Registration

本ドキュメントは UIController のイベント登録 API を定義する。画面表示・非表示や一時 UI 更新の仕様は [UIController Class](./ui_controller.md) を参照する。

### イベント登録メソッド (Event Registration)

- **`setStartHandler(handler: Function): void`**
    - タイトル画面の「開始ボタン」にハンドラを登録する。
    - **内部挙動**: 内部で保持する開始ボタン要素を引数として `setOperationHandler` を呼び出す。
- **`setRecordHandler(handler: Function): void`**
    - タイトル画面の「記録ボタン」にハンドラを登録する。
    - **内部挙動**: `ArchiveDialogView.setOpenHandler(handler)` へ委譲し、内部で `setOperationHandler` を通じて操作音付きクリックとして登録する。
- **`setReplayStartHandler(handler: (recordId: string) => void): void`**
    - Archive Replays タブの「PLAY REPLAY」操作にハンドラを登録する。
    - **内部挙動**: `ArchiveDialogView.setReplayStartHandler(handler)` へ委譲する。
    - **責務境界**: `UIController` は選択された replay record id の通知だけを中継し、リプレイ snapshot の復元や再生画面遷移は担当しない。
- **`showReplayScreen(record: FlightRecord, buildViewData?: BuildScreenViewData): void`**
    - Analytic Archive で選択された replay record の再生画面を表示する。
    - **内部挙動**:
        1. Archive overlay を非表示にする。
        2. タイトル、施設、航行結果画面を非表示にし、プレイシーンと HUD を表示する。
        3. 通常の `BuildPanelView` は非表示にし、`ReplayScreenView.show(buildViewData, record)` でリプレイ専用の発射構成パネルを表示する。
        4. リプレイ専用パネルは、発射に使った RocketItem / Launcher / Booster と `EXIT REPLAY` だけを表示する。これは現在インベントリを操作するビルドパネルではない。
            - ただし、右側の操作領域としての統一感を保つため、Panel の border、padding、header、scroll body、footer action のリズムはビルドパネルに合わせる。
            - `EXIT REPLAY` は `button-large` のラベル構造を使い、ASSEMBLE / LAUNCH とは異なるリプレイ用の色で表示する。
        5. `#replay-overlay` を表示し、リプレイ終了操作の入口を提供する。
    - **責務境界**: 復元済み `Rocket` / `Sector` の描画、物理再生、終了判定、発射構成 view data の生成は `AppOrchestrator` と各描画・物理クラスが担当する。`UIController` は表示切替と終了ボタンの入口だけを担当する。
- **`hideReplayScreen(): void`**
    - リプレイ HUD とリプレイ専用の発射構成パネルを非表示にする。
- **`setReplayExitHandler(handler: Function): void`**
    - リプレイ HUD の `EXIT REPLAY` ボタンにハンドラを登録する。
    - **内部挙動**: `#exit-replay-btn` に `setOperationHandler` を適用する。
- **`setReplayProtectHandler(handler: (request) => object): void`**
    - 航行結果画面と Archive Replays タブの protect 操作に共通で使う永続更新 handler を登録する。
    - **内部挙動**: `ReplayProtectFlow.setCommitHandler(handler)` へ委譲する。
    - **責務境界**: `UIController` は handler 登録を中継し、保護上限や永続保存は担当しない。

- **`setReplayProtectRecordsProvider(provider: () => FlightRecord[]): void`**
    - replay protect の5件上限判定と置き換え候補表示に使う record 一覧 provider を登録する。
    - **内部挙動**: `ReplayProtectFlow.setRecordsProvider(provider)` へ委譲する。
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
    - **内部挙動**: `BuildPanelView.setItemSelectionHandler(handler)` へ委譲する。

- **`setBuildAssembleHandler(handler: Function): void`**
    - ビルドパネルの「ASSEMBLE ボタン」にハンドラを登録する。
    - **内部挙動**: `BuildPanelView.setAssembleHandler(handler)` へ委譲する。

- **`setLaunchHandler(handler: Function): void`**
    - ビルド画面の「LAUNCH ボタン」にハンドラを登録する。
    - **内部挙動**: `BuildPanelView.setLaunchHandler(handler)` へ委譲する。

- **`setResultHandler(handler: Function): void`**
    - リザルト画面の「確定（OK / CONTINUE）ボタン」にハンドラを登録する。
    - **内部挙動**: `FlightResultScreenView.setResultHandler(handler)` へ委譲する。
    - **注意**: `GameController.start()` 時点ではリザルト画面 DOM が未生成のため、描画前の呼び出しで例外を投げてはならない。

- **`setGameEndReturnHandler(handler: Function): void`**
    - ゲームリザルト画面の「タイトルへ戻る」ボタンにハンドラを登録する。
    - **内部挙動**: ゲーム終了画面内の `END CONTRACT` ボタン要素を引数として `setOperationHandler` を呼び出す。

- **共有処理**
    - 航行結果画面とゲームオーバー画面の共有ボタンから、画像生成と共有 API 呼び出しを接続する。
    - 画像生成は `ShareImageRenderer`、ブラウザ共有方式の選択は `ShareService` へ委譲する。

- **`setMapToggleHandler(handler: (showMap: boolean) => void): void`**
    - リザルト画面の「マップ確認」ボタンにハンドラを登録する。表示文言は UI resource `flightResult.actions.viewMap` を使用する。
    - **内部挙動**: `FlightResultScreenView.setMapToggleHandler(handler)` へ委譲する。
    - **VIEW MAP 表示状態**:
        1. リザルト画面を非表示にし、プレイシーン、HUD、ビルドパネルを表示する。
        2. ビルドパネルは `BuildPanelView.showReadOnly()` で表示し、item selection は無効、パネル開閉は有効とする。
        3. `#map-action-dock` の戻りボタンでリザルト画面へ戻る。
    - **責務境界**: `FlightResultScreenView` はリザルト画面内の表示切替と戻りボタン生成を担当する。HUD とビルドパネルの表示状態は `UIController`、マップの再描画やゲーム状態の変更は `GameController` が担当する。

- **`setFacilityActionHandler(handler: (action: string, context: object) => void): void`**
    - 施設画面内の各アクションボタン（Buy, Sell, Repair 等）にハンドラを登録する。
    - **内部挙動**:
        1. ボタンごとの `data-action` や `data-uid` を抽出し、`handler` を実行する。
        2. 押下されたボタン要素は handler 実行前にロックし、同じ DOM 要素からの二重送信を防止する。
        3. handler が例外を投げた場合は例外を握りつぶさず、ボタンロックだけ解除して呼び出し元へ伝播する。
        4. コインの授受を伴う施設アクション（購入、売却、修理、分解、Black Market 取引）は `cashier` SE を再生する。

- **`setFacilityDepartHandler(handler: Function): void`**
    - 施設画面の「出発（DEPART）ボタン」にハンドラを登録する。
    - **内部挙動**: 出発ボタン要素を引数として `setOperationHandler` を呼び出す。

- **`setCanvasInputHandler(handler: (event: CanvasInputEvent) => void): void`**
    - マップ描画領域（Canvas）に対する入力を中継する（操作音なし）。
    - **内部挙動**: `MapInputController.setHandler(handler)` へ委譲する。
    - **責務境界**: UIController は入力通知先の接続のみを担当する。ブラウザ入力の購読と正規化は `MapInputController`、パン、回転、ズーム、AIM、天体ホバーの意味付けは `GameController` が担当する。
    - **注記**: 対象となる Canvas 要素の取得方法は、`WorldRenderer` の初期化仕様に準拠する。
