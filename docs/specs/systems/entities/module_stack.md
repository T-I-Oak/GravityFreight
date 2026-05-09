# Specification: ModuleStack Class (extends Item)

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Exist Lifecycle
- **役割**: ロケット内部で、同一 ID のモジュールを「耐久度プール」として一括管理するデータ構造。
- **ベースクラス**: **`Item`** を継承。これにより UI 側で他のアイテムと同列に扱えるようにする。
- **責務**:
    - 同一 ID であれば性能（耐久度・強化状態）を問わずアイテムを受け入れる。
    - 全アイテムの合計耐久度（`charges`）および合計最大耐久度（`maxCharges`）の算出。
    - 内部のアイテムに対する耐久度減算（消費）の実行。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`readonly items: Item[]`**: 保持している実体リスト。
- **`charges: number`**: 全アイテムの合計耐久度。追加・消費時に都度更新される。
- **`maxCharges: number`**: 全アイテムの合計最大耐久度。追加時に都度更新される。
- **`count: number`**: 保持しているアイテム数 (`items.length`)。

### メソッド (Methods)

- **`constructor(item: Item)`**
    - `uid` を `IDGenerator.generate('modulestack')` で生成し、`this.uid` に設定する。
    - 引数の `item` から `id`, `name`, `category` をコピーし、初期アイテムとして `items` リストに格納する。
- **`add(item: Item): void`**
    - アイテムをスタックに追加する。
    - **ルール**: `this.id === item.id` であれば無条件で追加し、以下のプロパティを更新する。
        - `items` リストに `item` を追加。
        - `this.charges += item.charges`
        - `this.maxCharges += item.maxCharges`
        - `this.count = this.items.length`
- **`consumeCharge(): boolean`**
    - 内部のアイテムのうち、耐久度が 1 以上残っているものから耐久度を 1 減らす。
    - **内部手順**:
        1. 内部リスト `items` を `charges` の昇順（少ない順、かつ 0 を除く）でソートする。
        2. 耐久度が 1 以上ある先頭のアイテムに対し `consumeCharge()` を実行する。
        3. **不滅ルール**: アイテムの耐久力が 0 になっても、リストからは除去しない。
        4. **プロパティ同期**: 減算後、**`this.charges` を 1 減らす**。
    - **戻り値**: 常に `false` を返す。
- **`getViewData(): ItemViewData`**
    - UI 描画用のプレーンオブジェクトを生成して返す。
    - **マッピング**:
        - `uid`: 自身の `uid`
        - `count`: 保持アイテム数 (`items.length`)
        - `name`, `category`: `items[0]` から取得
        - **`stats`**: プロパティごとに集計方法（Σ：加算、または Π：乗算）を適用して格納。
            - **Physical (Σ)**: `mass`, `charges`, `maxCharges`
            - **Capability (Σ)**: `precision`, `pickupRange`, `power`, `slots`
            - **Multipliers (Π)**: `precisionMultiplier`, `pickupMultiplier`, `gravityMultiplier`, `powerMultiplier`, `arcMultiplier`



