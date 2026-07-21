# Specification: StarInfoPanel Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 天体ホバー時の保持アイテム表示、およびマップ上の補足説明ポップアップ表示。
- **責務**:
    - `UIController` から渡された `CelestialBody` の `items` を、ポップアップ内の `ItemCard` として表示する。
    - 同一性能の item は `StackedItem` と同じ規則で集約し、表示件数を抑える。
    - ポップアップの表示位置をポインタ表示座標に追従させる。

## 2. インターフェース (Interface)

- **`constructor({ document })`**
    - `#star-info-panel`, `#star-info-title`, `#star-info-list` を取得する。
    - 対象要素が存在しない場合でも、表示操作は何もしない。

- **`show(body: CelestialBody, point: Vector2, canvas: HTMLCanvasElement): void`**
    - `body.items` が存在し、1件以上ある場合にポップアップを表示する。
    - `body.isHome === true` の場合はタイトルを `STAR CORE STORAGE`、それ以外は `STAR ITEMS` とする。
    - item 表示は `UIComponents.generateCardHTML()` を使用し、既存の `ItemCard` 表現と一致させる。
    - 集約後の item が 3種類以下の場合は通常カードで表示し、4種類以上の場合のみ compact 表示に切り替える。
    - パネル本体の背景は透明とし、背後のマップを隠さない。可読性は内部の `ItemCard` 背景で確保する。
    - 透明背景は `.theme-* .Panel` の偶発的な適用有無に依存せず、`StarInfoPanel` 専用スタイルとして明示する。
    - `point` は Canvas 内部座標ではなく表示用 CSS px 座標として扱う。
    - ポップアップが画面端からはみ出す場合は、ポインタの左側または上側へ折り返す。

- **`showMessage(message: { title: string, body: string, key: string }, point: Vector2, canvas: HTMLCanvasElement): void`**
    - item card ではなく短い説明文を表示する。
    - 配送 cargo の arc アイコン hover など、天体 item ではないマップ上の補足説明に使用する。
    - 説明文は、背後のマップと重なっても読めるように、十分に不透明な専用の背景枠内に表示する。
    - `key`、`title`、`body` が前回表示とすべて同じ場合は本文 DOM を再生成せず、表示位置だけ更新する。
    - `key` が同じでも `title` または `body` が変わった場合は再描画する。言語切り替え後に同じ hover 対象を表示し直したとき、古い文言を残してはならない。
    - `point` と画面端折り返しの扱いは `show()` と同じ。

- **`refreshCurrent(): void`**
    - 現在表示中の天体 item popup を、最新の item view data で再描画する。
    - 言語切り替え後も表示中 popup が古い item 名や説明文を残さないようにする。
    - 表示位置は最後に受け取った `point` / `canvas` を使って再計算する。
    - 説明文 popup の文言再取得は `StarInfoPanel` では行わず、呼び出し元が現在の言語で `showMessage()` を再実行する。

- **`hide(): void`**
    - ポップアップを非表示にする。
    - 現在表示中の body と item count のキャッシュをリセットする。

## 3. 責務境界 (Boundaries)

- 星のホバー判定は `GameController` が担当する。
- ブラウザの pointer event の購読と座標正規化は `UIController` が担当する。
- 天体や item の状態更新、回収処理は行わない。
- ポップアップは情報表示のみであり、内部の item card はクリック操作を持たない。
