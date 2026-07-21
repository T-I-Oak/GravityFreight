# Specification: BuildPanelView Class

## 1. 役割と責務

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: ビルドパネル表示。
- **責務**:
    - FLIGHT / ASSEMBLY タブの DOM 表示切替。
    - ビルドパネル内の item list、placeholder、ASSEMBLE / LAUNCH ボタンの DOM 反映。
    - ビルドパネル内操作を UIController の operation binder 経由で外部ハンドラへ中継する。
    - 航行結果のマップ確認や施設滞在中に、パネル開閉だけを許可し item selection を通知しない read-only 表示を提供する。

## 2. インターフェース

- **`constructor({ document, operationBinder })`**
    - `#inventory-panel`, `#build-btn`, `#launch-control`, `#launch-btn`, `#list-{category}` を取得する。
    - `#assembly-inventory-list` は Tutorial のハイライト対象として ASSEMBLY タブ内の一覧領域に付与する。
    - `#flight-inventory-list` は Tutorial のハイライト対象として FLIGHT タブ内の一覧領域に付与する。
    - 操作音とクリックイベント登録は `operationBinder` へ委譲する。

- **`initialize(): void`**
    - タブ切替とパネル開閉ボタンの DOM イベントを登録する。

- **`show(viewData?: BuildScreenViewData): void`**
    - ビルドパネルを表示し、折りたたみ状態を解除する。
    - `viewData` がある場合は `render(viewData)` を実行し、LAUNCH 操作領域を表示する。
    - `viewData` がない場合は LAUNCH 操作領域を非表示にする。

- **`hide(): void`**
    - ビルドパネルと LAUNCH 操作領域を非表示にする。

- **`showReadOnly(viewData?: BuildScreenViewData, options?: { collapse?: boolean, activeTab?: 'flight' | 'assembly' }): void`**
    - `viewData` が渡された場合は `render(viewData)` を実行してからビルドパネルを表示する。
    - `options.activeTab` が渡された場合は、表示開始時のタブをその値へ切り替える。
    - `options.collapse === false` の場合は、折りたたまず開いた状態で表示する。
    - item card / placeholder の選択操作は外部ハンドラへ通知しない。
    - パネル開閉操作は有効のままとする。

- **`close(): void`**
    - ビルドパネルを折りたたみ状態にする。

- **`setSelectionEnabled(isEnabled: boolean): void`**
    - item card / placeholder の選択通知可否を切り替える。
    - `false` の場合は `#inventory-panel` に `state-readonly` を付与する。

- **`setFlightMode(isFlight: boolean): void`**
    - 航行中の操作ロック状態をビルドパネルと LAUNCH 操作領域へ反映する。

- **`render(viewData: BuildScreenViewData): void`**
    - `rocket`, `launcher`, `booster`, `chassis`, `logic`, `module` の各 section を描画する。
    - 空 section は `UIComponents.generatePlaceholderHTML()`、item entry は `UIComponents.generateCardHTML()` を使用する。
    - `viewData.assembly` と `viewData.launch` からボタンの disabled 状態、誘導状態、文言を更新する。
    - ASSEMBLE / LAUNCH ボタンの二重送信用ロックは、`render()` による最新 view data 反映時に解除し、次の正規操作を受け付けられる状態へ戻す。

- **`setItemSelectionHandler(handler): void`**
    - `.item-list .ItemCard.state-clickable[data-uid]` のクリックを `{ category, uid }` として通知する。
    - handler が `BuildScreenViewData` を返した場合は `render(viewData)` でビルドパネル内部を再描画する。
    - 選択操作による再描画では `show()` を呼び直さず、現在の FLIGHT / ASSEMBLY タブ状態を維持する。
    - 再描画後のカードにも再登録する。

- **`setAssembleHandler(handler): void`**
    - ASSEMBLE ボタンを handler に接続する。
    - 同一 DOM ボタンに対する再登録では listener を追加せず、呼び出す handler だけを差し替える。
    - handler 実行後、FLIGHT タブへ戻す。
    - 押下されたボタン要素は handler 実行前にロックし、同じ DOM 要素からの二重送信を防止する。
    - handler が例外を投げた場合は例外を握りつぶさず、ボタンロックだけ解除して呼び出し元へ伝播する。

- **`setLaunchHandler(handler): void`**
    - LAUNCH ボタンを handler に接続する。
    - 同一 DOM ボタンに対する再登録では listener を追加せず、呼び出す handler だけを差し替える。
    - 押下されたボタン要素は handler 実行前にロックし、同じ DOM 要素からの二重送信を防止する。
    - handler が例外を投げた場合は例外を握りつぶさず、ボタンロックだけ解除して呼び出し元へ伝播する。

## 3. 責務境界

- inventory の抽出、選択可否、発射可能判定、表示文言生成は `BuildScreenPresenter` / `BuildFlowController` の責務。
- 画面全体の表示状態、HUD、施設画面、航行結果画面との切替は `UIController` の責務。
