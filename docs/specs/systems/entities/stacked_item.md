# Specification: StackedItem Class

## 1. 概要 (Overview)

`StackedItem` クラスは、同一の ID を持ち、かつ `Item.equals` メソッドによって「同一特性（同一性能・同一状態）」であると判定される複数の `Item` インスタンスを保持し、スタック（LIFO）形式で管理するコンテナエンティティである。
`uid` のみが異なる「完全に同質なアイテム」を効率的に一纏まりとして扱うために使用される。

- 生存期間: Exist Lifecycle (生成から消失まで)
- 依存関係: Item, DataManager

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `uid` | `string | null` | スタック自体の固有識別 ID。最初のアイテム追加時に生成され、空になるとリセットされる。 |
| `id` | `string | null` | スタックされるアイテムの共通 ID。 |
| `items` | `Item[]` | 内部に保持されている `Item` インスタンスの配列。 |
| `quantity` | `number` | 現在のスタック数量。 |
| `representative` | `Item | null` | スタックの代表アイテム（`items[0]`）。アイテムの名称や性能などの特性は、このオブジェクトを介して参照する。 |

### 2.2 メソッド (Methods)

#### `constructor()`
- 処理: 各プロパティを初期状態で初期化する。

#### `push(item)`
- 引数: `item`: Item インスタンス。
- 戻り値: boolean (追加に成功したか)
- 処理:
    1. スタックが空の場合、`uid`, `id`, `representative` を設定し、`items` に追加する。
    2. スタックが空でない場合、`item.equals(this.representative)` で特性が一致する場合のみ `items` に追加する。一致しない場合は `false` を返す。

#### `pop()`
- 戻り値: Item | null
- 処理:
    1. スタックの末尾から `Item` を取り出して返す。
    2. スタックが空になった場合は `uid`, `id`, `representative` をリセット（`null`）する。

#### `getSnapshot()`
- 戻り値: object (Plain Data / JSON)
- データ構造: `{ uid, itemSnapshots: [...] }`
- 処理: スタック自体の `uid` と、保持している各 `Item` のスナップショットを返す。

#### `static fromSnapshot(data)`
- 引数: `data`: スナップショットオブジェクト。
- 戻り値: StackedItem インスタンス
- 処理:
    1. インスタンスを生成する。
    2. スナップショットから Item インスタンスを復元し、順次 `push` する。
    3. 保存されていた `data.uid` で自身の `uid` を上書きする。

## 3. ロジック詳細

### 3.1 特性参照の挙動
- 本クラスはアイテム特性を保持しない。利用者は `representative` プロパティ（`Item` インスタンス）を介して、`name`, `mass`, `charges` 等の全てのアイテム属性にアクセスする。
- スタックが空の場合、`representative` は `null` である。
