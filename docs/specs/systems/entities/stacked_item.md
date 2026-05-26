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
    - `uid` を `IDGenerator.generate('stackeditem')` で生成し、`this.uid` に設定する。スタック固有のプレフィックスになる。
    - `this.id = item.id` をコピーし、スタックのマスターデータ ID を保持する。

    - `this.items = [item]` で内部リストを初期化する。
- **`add(item: Item): boolean`**
    - アイテムをスタックに追加する。
    - **判定ルール**: `items[0].equals(item)` が `true` を返す場合のみ追加し、`true` を返す。一致しない場合は何もせず `false` を返す。
- **`pop(): Item`**
    - スタックから実体を 1 つ取り出して返す（外部仕様としてはどのインスタンスが返るかは区別しないが、内部的には LIFO で動作する）。
- **`getViewData(): ItemViewData`**
    - `items[0].getViewData()` の結果を取得し、`uid` と `count` をスタック固有の値で上書きして返す。
    - **マッピング**:
        - `uid`: この **スタック自体の `uid`**（操作用ID）。
        - `count`: 保持しているアイテム数 (`items.length`)。
        - それ以外 (`name`, `category`, `description`, `stats` など) は `items[0].getViewData()` の結果をそのまま流用する。
          - ※`stats` に含まれる `charges`, `maxCharges`, 各種性能値も代表アイテム（`items[0]`）のものがそのまま引き継がれる。

- **`createSnapshot(): object`**
    - スタック状態をシリアライズ可能な形式で抽出する。
    - **保存対象**:
        - `uid`
        - `items`: 各 `Item.createSnapshot()` の結果
    - **保存しない値**:
        - `id`: `items[0]` から再解決する。
        - `count`: `items.length` から再計算する。

- **`static fromSnapshot(snapshot: object): StackedItem`**
    - `StackedItemSnapshot` からスタックを復元する。
    - **内部挙動**:
        1. `snapshot.items` の各要素を `Item.fromSnapshot()` で復元する。
        2. 先頭 item で `StackedItem` を生成し、残りの item を `add()` で追加する。
        3. `snapshot.uid` を復元する。
        4. `count` は復元した `items.length` から再計算する。
        5. 復元できない snapshot はデータ整合性エラーとして例外を投げる。

## 3. データ構造定義 (Data Structures)

### StackedItemSnapshot
```javascript
{
  uid: string,
  items: ItemSnapshot[]
}
```

- `items` は同一 ID かつ同一性能の個体リストとする。
- 復元時に同一性能でない item が混在している場合は、データ整合性エラーとして例外を投げる。

