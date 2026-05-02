# Specification: ItemContainer Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Session
- **役割**: アイテムの集合体（インベントリ）。
- **責務**:
    - 複数の `Item` または `StackedItem` の保持。
    - アイテムのリスト提供、検索、容量制限の管理。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`stacks: StackedItem[]`**
    - 現在保持している全アイテムスタックのリスト。

### メソッド (Methods)

- **`addItem(item: Item): void`**
    - コンテナにアイテムを追加する。
    - **ルール**: `stacks` 内に「同一 ID かつ同一性能」のスタックが存在すればそこに追加し、存在しなければ新しい `StackedItem` を作成してリストに加える。
- **`getItemsByCategory(category: string): StackedItem[]`**
    - 指定されたカテゴリに属する全 `StackedItem` のリストを抽出して返す。
- **`popItemByUid(stackUid: string): Item`**
    - `stacks` 内から、指定された **「`StackedItem` の UID」** を持つスタックを探し、その中から `Item` インスタンスを 1 つ取り出して返す。
    - **クリーンアップ**: 取り出した結果、`stack.count === 0` になった場合は、`stacks` リストからその `StackedItem` を除去する。
