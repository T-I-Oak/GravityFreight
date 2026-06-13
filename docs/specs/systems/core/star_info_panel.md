# Specification: StarInfoPanel Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 天体ホバー時の保持アイテム表示。
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
    - `point` は Canvas 内部座標ではなく表示用 CSS px 座標として扱う。
    - ポップアップが画面端からはみ出す場合は、ポインタの左側または上側へ折り返す。

- **`hide(): void`**
    - ポップアップを非表示にする。
    - 現在表示中の body と item count のキャッシュをリセットする。

## 3. 責務境界 (Boundaries)

- 星のホバー判定は `GameController` が担当する。
- ブラウザの pointer event の購読と座標正規化は `UIController` が担当する。
- 天体や item の状態更新、回収処理は行わない。
- ポップアップは情報表示のみであり、内部の item card はクリック操作を持たない。
