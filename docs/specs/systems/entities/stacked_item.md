# Specification: StackedItem Class

## 1. 概要 (Overview)

`StackedItem` クラスは、同一の ID を持ち、かつ `Item.equals` メソッドによって「同一特性（同一性能・同一状態）」であると判定される複数の `Item` インスタンスを保持し、スタック（LIFO）形式で管理するコンテナエンティティである。
`uid` のみが異なる「完全に同質なアイテム」を効率的に一纏まりとして扱うために使用される。

- **生存期間**: Exist Lifecycle (生成から消失まで)
- **依存関係**: `Item`, `DataManager`

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `uid` | `string | null` | スタック自体の固有識別 ID。最初のアイテム追加時に生成され、空になるとリセットされる。 |
| `id` | `string | null` | スタックされるアイテムの共通 ID。 |
| `items` | `Item[]` | 内部に保持されている `Item` インスタンスの配列。 |
| `quantity` | `number` | 現在のスタック数量（`items.length`）。 |
| `representative` | `Item | null` | スタックの代表アイテム（`items[0]`）。特性値の参照および比較用。 |
| **(以下代表アイテム経由)** | | |
| `name` | `string` | 表示名。 |
| `category` | `string` | カテゴリ。 |
| `rarity` | `string` | レアリティ。 |
| `description` | `string` | 説明文。 |
| `performance` | `object` | `mass`, `power`, `slots` などの全性能数値。代表アイテムの値をそのまま提供する。 |

### 2.2 メソッド (Methods)

#### `constructor()`
- **処理**:
    1. 空の `items` 配列を初期化する。
    2. `uid`, `id` を `null` で初期化する。

#### `push(item)`
- **引数**: `item`: `Item` インスタンス。
- **戻り値**: `boolean` (追加に成功したか)
- **処理**:
    1. スタックが空の場合：
        - 固有の `uid` を生成して設定する。
        - `item.id` を自身の `id` として設定する。
        - `items` 配列に `item` を追加する。
        - **`representative` を設定する（`items[0]`）。**
        - `true` を返す。
    2. スタックが空でない場合：
        - `item.equals(this.representative)` を実行する。
        - 一致（`true`）すれば、`items` 配列に追加し、`true` を返す。
        - 不一致（`false`）であれば、追加せず `false` を返す。

#### `pop()`
- **戻り値**: `Item | null`
- **処理**:
    1. `items` 配列の末尾から `Item` を取り出す。
    2. スタックが空になった場合は `uid`, `id`, **`representative`** をリセット（`null`）する。
    3. 取り出したアイテムを返す。

#### `getSnapshot()`
- **戻り値**: `object` (Plain Data / JSON)
- **データ構造**: `{ uid, itemSnapshots: [...] }`
- **処理**: スタック自体の `uid` と、各アイテムのスナップショットを保持する。

#### `static fromSnapshot(data)`
- **引数**: `data`: `getSnapshot` で生成されたオブジェクト。
- **戻り値**: `StackedItem` インスタンス
- **処理**:
    1. インスタンスを生成する。
    2. `data.itemSnapshots` の各要素に対し、`Item.fromSnapshot(snapshot)` を実行して `Item` インスタンスを復元し、順次 `push` する。
    3. 保存されていた `data.uid` で自身の `uid` を上書きする。

## 3. ロジック詳細

### 3.1 性能補正の参照 (Proxy Pattern)
- スタック自体のプロパティ（`name`, `mass` 等）へのアクセスは、原則として `this.representative` へのプロキシ（またはゲッター）として実装する。
- スタックが空の場合のアクセスは `undefined` またはデフォルト値を返すものとし、呼び出し側で `quantity` をチェックすることを基本とする（Natural Failure 原則）。

### 3.2 質量 (Total Mass) の計算
- フライトスペック集計時など、スタック全体の質量が必要な場合は `this.representative.mass * this.quantity` を算出する。
