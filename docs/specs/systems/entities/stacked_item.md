# Specification: StackedItem Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Session
- **役割**: 個数を持つアイテムのコンテナ。
- **責務**:
    - 同一 ID のアイテムの個数管理。
    - アイテムの追加・削除・分割ロジックの提供。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`readonly uid: string`**: このスタック（山）自体のユニーク ID。
- **`readonly id: string`**: マスターデータ上の ID。
- **`readonly items: Item[]`**: 同一 ID かつ **「全く同じ性能」** を持つ実体（`Item` インスタンス）のリスト。
- **`count` (Getter)**: 保持しているアイテム数 (`items.length`)。

### メソッド (Methods)

- **`constructor(item: Item)`**
    - 最初のアイテムを受け取り、スタックを初期化する。スタック自体の `uid` を生成する。
- **`add(item: Item): boolean`**
    - アイテムをスタックに追加する。
    - **判定ルール**: `items[0].equals(item)` が `true` を返す場合のみ追加し、`true` を返す。一致しない場合は何もせず `false` を返す。
- **`pop(): Item`**
    - スタックから実体を 1 つ取り出して返す（外部仕様としてはどのインスタンスが返るかは区別しないが、内部的には LIFO で動作する）。
- **`getViewData(): ItemViewData`**
    - UI 描画（アイテムカード）に必要な情報を集約して返す。
    - **マッピング**:
        - `uid`: この **スタック自体の `uid`**（操作用IDとして使用）。
        - `count`: 保持しているアイテム数。
        - その他の表示項目（`name`, `category`, `charges`, `maxCharges`, `stats` 等）: `items[0].getViewData()` の結果をベースに構築する。
