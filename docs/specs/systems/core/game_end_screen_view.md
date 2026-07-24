# Specification: GameEndScreenView Class

## 1. 役割と責務

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: ゲームオーバー時の最終レシート画面表示。
- **責務**:
    - ゲームリザルトをレシート形式の HTML として生成する。
    - レシート表示、grade stamp 演出、stamp SE 再生タイミングを管理する。
    - `END CONTRACT` と共有ボタンの DOM イベントを登録する。

## 2. インターフェース

- **`show(gameResult: GameResultSummary, gameOver: object): void`**
    - レシート HTML を生成して `#game-result-scene-container` に反映する。
    - 表示開始を短く遅延し、逆ワープ演出の途中でレシートが出るようにする。
    - `gameOver.reason` は制御情報であり、レシートの ranking / grade 表示を置き換えない。
    - 画面高が小さい場合でも `END CONTRACT` / `SHARE` まで到達できるよう、レシートまたは画面全体をスクロール可能にする。
    - レスポンシブ表示では、共通 UI scale に合わせてレシート全体の寸法、余白、文字サイズ、スタンプ、バーコード、操作ボタンを同じ比率で縮小する。
    - スクロールバーは表示可能性を維持しつつ、印刷テーマに合わせた控えめな見た目にする。

- **`hide(): void`**
    - レシート画面を非表示にし、表示待ち timer と DOM をクリアする。

- **`setReturnHandler(handler): void`**
    - `END CONTRACT` ボタンの操作を登録する。

- **`setShareHandler(handler): void`**
    - `SHARE` ボタンの操作を登録する。
    - 押下時に現在のレシート DOM を handler へ渡す。
    - 共有画像生成や共有 API 呼び出しは handler 側へ委譲する。

## 3. 責務境界

- ゲーム終了判定と最終集計は `SectorProgressionController` / `GameController` の責務。
- 逆ワープ背景の描画と減速は `WorldRenderer` / `BackgroundManager` の責務。
- 共有画像の生成は `ShareImageRenderer`、共有 API の選択は `ShareService` の責務。
