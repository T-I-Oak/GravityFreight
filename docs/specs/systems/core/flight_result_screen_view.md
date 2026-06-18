# Specification: FlightResultScreenView Class

## 1. 役割と責務

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 航行結果画面表示。
- **責務**:
    - 航行結果画面 HTML の生成・表示。
    - スコア、コイン、明細値の表示を 0 から最終値へ加算アニメーションする。
    - 航行結果画面内の確定、マップ確認、リプレイ保護操作の DOM イベント接続。
    - `VIEW MAP` 中のリザルト画面非表示、戻りボタン表示、マップ表示開始・終了通知。

## 2. インターフェース

- **`constructor({ document, gameDataRepository, operationBinder, components })`**
    - `#flight-result-screen`, `#play-scene-container`, `#play-hud`, `#map-action-dock` を取得する。
    - HTML 生成は `components`（通常は `FlightResultComponents`）へ委譲する。
    - 操作音とクリックイベント登録は `operationBinder` へ委譲する。

- **`show(viewData: FlightResultViewData): void`**
    - `FlightResultComponents.generateHTML(viewData, gameDataRepository)` の結果を `#flight-result-screen` へ反映する。
    - `#map-action-dock` に残っている戻りボタンを消去する。
    - `data-count-to` を持つ数値表示を 0 から最終値へ進める。
    - 登録済みの操作ハンドラを、生成済み DOM に接続する。

- **`hide(): void`**
    - 航行結果画面を非表示にする。
    - 進行中の加算アニメーションを停止する。

- **`setResultHandler(handler): void`**
    - 確定ボタンの操作を登録する。

- **`setMapToggleHandler(handler: (showMap: boolean) => void): void`**
    - `VIEW MAP` ボタンの操作を登録する。
    - `VIEW MAP` 押下時は、航行結果画面を非表示にする。
    - プレイシーン、HUD、ビルドパネル read-only 表示の制御は `UIController` から渡される map view callback に委譲する。
    - `#map-action-dock` に `flightResult.actions.backToResult` の戻りボタンを表示する。
    - マップ表示開始時に `handler(true)`、戻りボタン押下時に `handler(false)` を通知する。

- **`clearMapActionDock(): void`**
    - `#map-action-dock` の内容を消去する。

## 3. 責務境界

- 航行結果 view data の生成は `GameController` の責務。
- replay protect 操作の上限判定、航行結果画面の保護対象編集モーダル、永続更新 handler 呼び出しは `ReplayProtectFlow` の責務。
- `FlightResultScreenView` は `ReplayProtectFlow.request()` の結果に基づいて protect 表示を更新する。
- 航行結果画面で未保存 replay を protect した場合、protect 成功時点で replay は保存済みとして扱い、recorded 表示も `RECORDED` に更新する。
- `FlightResultScreenView` は保護対象編集モーダル用に、今回の航行結果のスコア、到達セクター、日時を `ReplayProtectFlow` へ渡す。
- マップ再描画は `GameController` / `WorldRenderer` の責務。
- ビルドパネル、HUD、施設画面を含む画面全体の大域的な表示切替は `UIController` の責務。
