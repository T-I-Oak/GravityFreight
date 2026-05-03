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
