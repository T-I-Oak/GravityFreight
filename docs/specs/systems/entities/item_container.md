# Specification: ItemContainer Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Session
- **役割**: アイテムの集合体（インベントリ）。
- **責務**:
    - 複数の `Item` または `StackedItem` の保持。
    - アイテムのリスト提供、検索、容量制限の管理。

## 2. インターフェース (Interface)

- **`addItem(item: Item): void`**
    - コンテナにアイテムを追加する。
