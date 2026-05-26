# Specification: RocketItem Class (extends Item)

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Exist Lifecycle
- **役割**: 複数のパーツ（Item インスタンス）で構成された、組み上げ済みロケットのデータモデル。
- **ベースクラス**: **`Item`** を継承。これにより `uid`, `id`, `name`, `rarity` 等の基本属性を保持し、インベントリ内での管理を可能にする。
- **責務**:
    - 構成パーツ（chassis, logic, modules）の参照保持。
    - 各パーツの性能を統合した、ロケット最終スペックの動的算出。
    - ロケット全体の資産価値（査定価格・保険金額）の計算。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **Components**
    - `readonly chassis: Item`: 必須。
    - `readonly logic: Item`: 必須。
    - **`readonly modules: ModuleStack[]`**: ID ごとに集約されたモジュールのプール。

- **Aggregated Stats (Getters)**
    - `mass`: 全構成パーツの `mass` の合計（Σ）。
    - `slots`: 全構成パーツの `slots` の合計（Σ）。
    - `precision`: 全構成パーツの `precision` の合計（Σ）。
    - `precisionMultiplier`: 全構成パーツの `precisionMultiplier` の乗算結果（Π）。
    - `pickupRange`: 全構成パーツの `pickupRange` の合計（Σ）。
    - `pickupMultiplier`: 全構成パーツの `pickupMultiplier` の乗算結果（Π）。
    - `gravityMultiplier`: 全構成パーツの `gravityMultiplier` の乗算結果（Π）。
    - ※各ゲッターは、`chassis`, `logic` および `modules` 内の全 `Item` を走査して集計する。

### メソッド (Methods)

- **`constructor(chassis: Item, logic: Item, modules: Item[])`**
    - 各パーツのインスタンスを受け取り、`modules` を ID ごとに `ModuleStack` へ集約して初期化する。
    - **uid の生成**: `IDGenerator.generate('rocketitem')` を用いて生成する。
    - **name の生成**: `chassis.name + " ＋ " + logic.name` として自身の名称を決定する。
- **`getViewData(): ItemViewData`**
    - UI 表示（アイテムカード）用のプレーンオブジェクトを生成して返す。
    - **マッピング**:
        - `uid`: 自身の `uid`
        - `name`: 自身の `name`（シャーシ名 ＋ ロジック名）
        - `category`: "rocket"
        - **`stats`**: 全構成パーツを集計した値を `{ value, enhanceCount }` 形式で格納する。
            - **Physical (Σ)**: `mass`, `charges`, `maxCharges`
            - **Capability (Σ)**: `precision`, `pickupRange`, `power`, `slots`
            - **Multipliers (Π)**: `precisionMultiplier`, `pickupMultiplier`, `gravityMultiplier`, `powerMultiplier`, `arcMultiplier`
        - **`modules` (Composition)**: 構成パーツ（`chassis`, `logic`, および各 `ModuleStack`）の `getViewData()` の結果を再帰的に格納する。

- **`createSnapshot(): object`**
    - 組み上げ済みロケットの構成状態をシリアライズ可能な形式で抽出する。
    - **保存対象**:
        - `uid`
        - `chassis`: `Item.createSnapshot()` の結果
        - `logic`: `Item.createSnapshot()` の結果
        - `modules`: 各 `ModuleStack.createSnapshot()` の結果
    - **保存しない値**:
        - `name`: `chassis` と `logic` から再生成する。
        - `mass`, `slots`, `precision`, `pickupRange`, 各種 multiplier などの集計値。
        - 構成パーツのマスタ由来プロパティ。

- **`static fromSnapshot(snapshot: object): RocketItem`**
    - `RocketItemSnapshot` から組み上げ済みロケットを復元する。
    - **内部挙動**:
        1. `snapshot.chassis` を `Item.fromSnapshot()` で復元する。
        2. `snapshot.logic` を `Item.fromSnapshot()` で復元する。
        3. `snapshot.modules` を `ModuleStack.fromSnapshot()` で復元する。
        4. 復元専用経路で `RocketItem` を生成し、`chassis`, `logic`, `modules`, `uid` を snapshot の内容で復元する。
        5. 通常 constructor のモジュール集約処理は、復元済み `ModuleStack` の uid や内部 item 状態を失わせないため実行しない。
        6. 集計性能は復元した構成パーツから再計算する。
        7. 復元できない snapshot はデータ整合性エラーとして例外を投げる。

## 3. データ構造定義 (Data Structures)

### RocketItemSnapshot
```javascript
{
  uid: string,
  chassis: ItemSnapshot,
  logic: ItemSnapshot,
  modules: ModuleStackSnapshot[]
}
```

- 発射構成は ID 参照ではなく、構成パーツの個体 snapshot として保存する。
- `modules` は同種モジュールを集約した `ModuleStackSnapshot` の配列とする。
