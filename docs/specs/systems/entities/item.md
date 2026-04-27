# Specification: Item (アイテムクラス仕様書)

## 1. 概要 (Overview)

`Item` クラスは、Gravity Freight V2 における**ロケット構成パーツおよび発射装備（Chassis, Logic, Module, Launcher, Booster）**の基体となるエンティティである。

- **生存期間**: Exist Lifecycle (生成されてから、紛失・破棄・消失するまで)
- **役割**: 個体ごとの属性（耐久度、強化状態）の保持と、性能情報の提供。
- **依存関係**: `DataManager`

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

以下のプロパティは、インスタンスから直接アクセス可能（Getter 含む）である。
※「強化対象」とあるものは、[3.1 性能計算ロジック] が適用された後の最終値を返す。

| プロパティ | 型 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **【識別・状態】** | | | |
| `uid` | `string` | 個体を識別する一意のID。 | |
| `id` | `string` | マスタ定義ID。 | |
| `category` | `string` | アイテムの分類。 | |
| `charges` | `number` | 現在の残り回数/耐久度。 | |
| `enhancement` | `object` | 項目ごとの**強化回数**を保持するオブジェクト。 | `key: count` 形式 |
| `enhancementCount` | `number` | 全項目の累計強化回数 (`Sum(enhancement)`)。 | |
| **【基本情報】** | | | |
| `name` | `string` | 表示名。 | |
| `rarity` | `number` | レアリティ (5〜20)。 | |
| `description` | `string` | 説明文。 | |
| **【性能プロパティ】** | | | |
| `mass` | `number` | 質量。 | |
| `slots` | `number` | スロット提供数。 | 強化対象 (`+1`) |
| `precision` | `number` | 予測精度（固定値加算）。 | |
| `pickupRange` | `number` | 回収範囲（固定値加算）。 | |
| `precisionMultiplier` | `number` | 予測精度の補正倍率。 | 強化対象 (`+0.2`) |
| `pickupMultiplier` | `number` | 回収範囲の補正倍率。 | 強化対象 (`+0.2`) |
| `gravityMultiplier` | `number` | 重力影響の補正倍率。 | 強化対象 (`-0.1`) |
| `powerMultiplier` | `number` | 発射パワーの補正倍率。 | |
| `arcMultiplier` | `number` | 出口判定エリアの補正倍率。 | |
| `power` | `number` | 発射台としての基礎パワー。 | |
| `maxCharges` | `number` | アイテムの最大耐久度。 | 強化対象 (`+1`) |
| **【特殊属性・フラグ】** | | | |
| `onLostBonus` | `boolean` | ロスト保険フラグ。 | |
| `ghostType` | `string` | 予測線の表示タイプ。 | |
| `duration` | `number` | 効果持続時間。 | |
| `preventsLauncherWear`| `boolean` | 発射台摩耗防止フラグ。 | |

### 2.2 メソッド (Methods)

#### `constructor(uid, masterId, dynamicState = {})`
- **処理**:
    1. プロパティの初期化。
    2. `DataManager.getItemById(masterId)` からマスタ定義を取得・保持。
    3. `dynamicState.enhancement` を保持（空の場合は `{}`）。
    4. `dynamicState.charges` が未指定なら計算後の `maxCharges` を初期値とする。

#### `getStat(key)`
- **戻り値**: `number` | `boolean` | `string`
- **処理**: マスタ値 (`BaseValue`) に対して、強化回数に基づく補正を行って返す。
    - `FinalValue = BaseValue + (enhancement[key] * StepValue)`
    - ※ `StepValue` は [3.2 強化増分] を参照。

#### `upgrade(key)`
- **処理**:
    1. `enhancement[key]` を +1 する。
    2. 累計強化回数 `enhancementCount` を更新する。

#### `repair(amount = null)`
- **処理**: `charges` を回復する（最大 `maxCharges`）。強化回数にはカウントされない。

#### `getSnapshot()`
- **処理**: 保存・復元に必要な最小限のデータ（`uid`, `id`, `charges`, `enhancement`）を返す。

---

## 3. ロジック詳細

### 3.1 耐久度 0 (charges === 0) の扱い
- `charges` が 0 の場合、`mass` を除くすべての性能プロパティは無効化される（加算値: 0 / 乗算値: 1.0 を返す）。

### 3.2 強化増分 (Enhancement Step)
各項目の強化 1 回あたりの増分（または減分）は以下の通り。
- `slots`: +1
- `precisionMultiplier`: +0.2
- `pickupMultiplier`: +0.2
- `gravityMultiplier`: -0.1 (最小値 0.1)
- `maxCharges`: +1

### 3.3 強化 (Enhancement) のルール
- `enhancement` オブジェクトには「値」ではなく「強化した回数」を記録する。
- UI（`UIComponents.js`）は、`enhancement[key] > 0` かどうかを見てハイライト表示を制御する。
