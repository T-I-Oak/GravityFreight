# Specification: MapInputController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: Canvas 入力イベントの正規化。
- **責務**:
    - `#gameCanvas` と `window` の pointer / wheel event を購読する。
    - ブラウザ event をゲーム側の `CanvasInputEvent` へ変換する。
    - Canvas 外や UI パネル上へドラッグが継続した場合も、開始済みの操作を `pointerup` / `pointercancel` まで維持する。

## 2. インターフェース (Interface)

- **`constructor({ document, canvas })`**
    - 入力購読に使用する `document` と `HTMLCanvasElement` を保持する。
    - 複数ポインタ管理、pinch 距離、pinch 中心を初期化する。

- **`setHandler(handler: (event: CanvasInputEvent) => void): void`**
    - 正規化後の入力通知先を登録する。
    - 初回のみ DOM event listener を登録し、再登録時は通知先だけを差し替える。

## 3. CanvasInputEvent

- **`pointerdown`**: `{ type, point, shiftKey, ctrlKey, pointerType }`
- **`pointermove`**: `{ type, point, pointerType }`
- **`pointerup`**: `{ type, point }`
- **`gesturestart`**: `{ type, point }`
- **`pinch`**: `{ type, point, delta, scale }`
- **`wheel`**: `{ type, point, deltaY }`
- **`hover`**: `{ type, point, displayPoint, pointerType }`
- **`hoverleave`**: `{ type }`

## 4. 座標仕様

- `point` は Canvas 内部座標であり、`getBoundingClientRect()` と `canvas.width` / `canvas.height` の比率から算出する。
- `displayPoint` はポップアップ配置用の CSS px 座標であり、Canvas 表示領域左上を原点とする。
- hover はドラッグ中でない Canvas 内 pointermove だけで発生する。

## 5. 責務境界

- パン、ズーム、回転、AIM、天体ホバーなどの意味付けは `GameController` が担当する。
- DOM 表示やポップアップ描画は `UIController` / `StarInfoPanel` が担当する。
