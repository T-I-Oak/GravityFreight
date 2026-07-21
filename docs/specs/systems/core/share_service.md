# Specification: ShareService / ShareImageRenderer

## 1. 役割と責務

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 共有画像生成と共有 API 呼び出し。
- **責務**:
    - `ShareImageRenderer` は共有用 PNG 画像を canvas で生成する。
    - `ShareService` は生成済み画像を、モバイルでは Web Share API、PC では Clipboard API と X 投稿導線の組み合わせで共有する。
    - 画面 View は共有ボタンの DOM イベント接続だけを担当し、画像生成や共有 API の詳細を持たない。

## 2. インターフェース

- **`ShareService.shareImage({ blob, fileName, title, text }): Promise<object>`**
    - `blob` は必須。
    - モバイル環境で file share が利用可能なら `navigator.share({ files, title, text })` を使う。
    - PC 環境、または file share が利用できない環境では Clipboard API で画像を書き込む。
    - Clipboard API で画像を書き込めた場合、確認 UI を表示できるなら、X を開いて貼り付ける導線を表示する。
    - 確認 UI または Clipboard API が利用できない場合は、共有テキスト入りの X intent を別タブで開く。
    - 戻り値には使用した共有方式を `mode` として返す。

- **`ShareImageRenderer.createFlightResultImage({ viewData, mapCanvas, gameDataRepository }): Promise<Blob>`**
    - 航行結果のタイトル、スコア、コイン、明細を共有画像へ描画する。
    - 実際の描画処理は `FlightResultShareImagePainter` へ委譲する。
    - `viewData.shareMap` は必須。存在しない場合は、航行結果 view data 生成のバグとして例外にする。
    - `shareMap.bodies`, `shareMap.exits`, `shareMap.trail`, `shareMap.rocket` は必須。欠落を空配列や既定値で補完して描画を続けてはならない。
    - `shareMap` 内の座標、半径、角度、幅、速度は有限数であること。欠落や不正値は共有用データ生成のバグとして例外にする。
    - `shareMap.exits` の各要素は `facilityType` と `facilityName` を持つ。施設名は出口 arc に沿う向きで文字単位に描画する。
    - マップ領域は現在の map canvas 取り込みではなく、共有専用データから描画する。共有画像では航跡と到着ロケットを明示するため、実画面 canvas の単純コピーは行わない。
    - マップ領域には共有画像用の星背景を描画し、宇宙空間として成立する密度を保つ。
    - `bodies` から星を描画する。
    - `exits` から boundary と exit arc を描画する。
    - `trail` は発射時点からの全航跡を描画する。全体は薄く残し、到着地点に近い末端部分は本編航行画面の航跡色に近い色でやや長く減衰させる。
    - `rocket` は到着地点のロケットとして、共有画像上で視認できるサイズで描画する。

- **`ShareImageRenderer.createGameEndImage({ receiptElement }): Promise<Blob>`**
    - ゲームオーバーのレシート内容を共有画像へ描画する。
    - 実際の描画処理は `GameEndReceiptShareImagePainter` へ委譲する。
    - `receiptElement` は必須。存在しない場合は呼び出し元のバグとして例外にする。
    - レシート DOM は `.text-display`, `.text-sub-display`, `.panel-body > .section`, `.section.hero`, `.receipt-stamp-right-half`, `.auth-status`, `.timestamp` を持つこと。
    - 通常の評価行は `.panel-body > .section:not(.hero)` の `.SplitRow.data-row` から読み取り、最終スコアは `.section.hero` の `.SplitRow.data-row` から読み取る。
    - 必須 DOM が欠落している場合は例外にし、プレーンテキスト解析や固定値で補完してはならない。
    - スタンプ位置や角度は、実画面と完全一致しなくてよい。

## 3. 責務境界

- 航行結果 view data の生成は `FlightResultViewDataFactory` の責務。
- 航行結果共有用の `shareMap` は `ShareMapViewDataFactory` が航行終了時点の `currentSector` / `currentRocket.actualTrail` / `currentRocket.position` / `currentRocket.velocity` から生成する。
- レシート DOM の生成は `GameEndScreenView` の責務。
- 共有画像の canvas と Blob 化は `ShareImageRenderer` の責務。航行結果画像の見た目調整は `FlightResultShareImagePainter`、レシート画像の見た目調整は `GameEndReceiptShareImagePainter` の責務。
- ブラウザごとの共有手段選択は `ShareService` の責務。
- PC 向けの「画像をクリップボードへコピー済み」確認 UI は `ShareService` が DOM 要素を検出して表示する。
