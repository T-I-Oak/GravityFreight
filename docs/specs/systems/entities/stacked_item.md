# Specification: StackedItem Class

## 1. 概要 (Overview)

`StackedItem` クラスは、数量（Quantity）の概念を持ち、同一 ID であれば個体差（耐久度や強化状態）を持たないアイテムの集合を表現するエンティティである。
主に、通商物資（Cargo）、リソース、通貨チップなどの「スタック可能な資産」に使用される。

- **生存期間**: Game Lifecycle
- **依存関係**: `DataManager`

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `string` | マスタ定義ID。 |
| `quantity` | `number` | 現在のスタック数量。 |
| `name` | `string` | 表示名。マスタデータから取得。 |
| `category` | `string` | カテゴリ。マスタデータから取得。 |
| `rarity` | `string` | レアリティ。マスタデータから取得。 |
| `description` | `string` | 説明文。マスタデータから取得。 |
| `mass` | `number` | 1つあたりの質量。集計時に使用。 |

### 2.2 メソッド (Methods)

#### `constructor(masterId, initialQuantity = 1)`
- **引数**:
    - `masterId`: マスタ定義ID。
    - `initialQuantity`: 初期数量（デフォルト 1）。
- **処理**:
    1. `DataManager` から `masterId` に基づくマスタ定義を取得する。
    2. プロパティを初期化する。マスタに存在しない項目は `Item` クラスと同様のデフォルト値（加算系は 0、乗算系は 1.0）で補完する。

#### `add(amount = 1)`
- **引数**: `amount`: 増加させる数量。
- **戻り値**: `number` (更新後の quantity)
- **処理**: 数量を指定量増加させる。

#### `remove(amount = 1)`
- **引数**: `amount`: 減少させる数量。
- **戻り値**: `number` (更新後の quantity)
- **処理**: 数量を指定量減少させる。0 未満になる場合の制約は設けない（Natural Failure 原則）。

#### `getSnapshot()`
- **戻り値**: `object` (Plain Data / JSON)
- **処理**: 自身の状態をシリアライズ可能なプレーンオブジェクトとして返す。
- **データ**: `{ id, quantity }`

#### `static fromSnapshot(data)`
- **引数**: `data`: `getSnapshot` で生成されたオブジェクト。
- **戻り値**: `StackedItem` インスタンス
- **処理**: 渡されたデータに基づいてクラスを再構築（Hydration）する。

## 3. ロジック詳細

### 3.1 Item クラスとの使い分け
- **Item**: 耐久度、強化回数、一意な `uid` を持ち、個別に管理されるもの（パーツ、発射台）。
- **StackedItem**: ID と数量のみで管理され、個体別の状態を持たないもの（貨物、リソース）。

### 3.2 性能補正の算出
- `StackedItem` が質量（mass）などの性能値を持つ場合、本クラスは「1つあたりの値」を保持する。
- 最終的な合計値（例：インベントリ全体の総質量）は、本クラスの利用側（Rocket や Inventory）が `quantity` を乗算して算出する。
