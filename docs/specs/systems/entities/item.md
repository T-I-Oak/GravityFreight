# Specification: Item (アイテムクラス仕様書)

## 1. 概要 (Overview)

`Item` クラスは、Gravity Freight V2 における**ロケット構成パーツおよび発射装備（Chassis, Logic, Module, Launcher, Booster）**の基体となるエンティティである。

- **生存期間**: Exist Lifecycle (生成されてから、紛失・破棄・消失するまで)
- **役割**: 個体ごとの属性（耐久度、強化状態）の保持と、性能情報の提供。
- **依存関係**: `DataManager`

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

以下のプロパティは、インスタンスから直接アクセス可能（Getter 含む）である。
※「強化対象」とあるものは、`enhancement` による補正が適用された後の最終値を返す。

| プロパティ | 型 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **【識別・状態】** | | | |
| `uid` | `string` | 個体を識別する一意のID。 | |
| `id` | `string` | マスタ定義ID。 | |
| `category` | `string` | アイテムの分類。 | |
| `charges` | `number` | 現在の残り回数/耐久度。 | |
| `enhancement` | `object` | 項目ごとの強化値を保持するオブジェクト。 | `key: bonusValue` 形式 |
| **【基本情報】** | | | |
| `name` | `string` | 表示名。 | |
| `rarity` | `number` | レアリティ (5〜20)。 | |
| `description` | `string` | 説明文。 | |
| **【性能プロパティ】** | | | |
| `mass` | `number` | 質量。 | 強化対象 |
| `slots` | `number` | スロット提供数。 | 強化対象 |
| `precision` | `number` | 予測精度（固定値加算）。 | 強化対象 |
| `pickupRange` | `number` | 回収範囲（固定値加算）。 | 強化対象 |
| `precisionMultiplier` | `number` | 予測精度の補正倍率。 | 強化対象 |
| `pickupMultiplier` | `number` | 回収範囲の補正倍率。 | 強化対象 |
| `gravityMultiplier` | `number` | 重力影響の補正倍率。 | 強化対象 |
| `powerMultiplier` | `number` | 発射パワーの補正倍率。 | 強化対象 |
| `arcMultiplier` | `number` | 出口判定エリアの補正倍率。 | 強化対象 |
| `power` | `number` | 発射台としての基礎パワー。 | 強化対象 |
| `maxCharges` | `number` | アイテムの最大耐久度。 | 強化対象 |
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
- **処理**: マスタ値 (`BaseValue`) に対して、`enhancement[key]` が存在すれば加算した値を返す。
    - `FinalValue = BaseValue + (enhancement[key] || 0)`
    - フラグ系（`onLostBonus`等）の場合は、マスタ定義の boolean 値をそのまま返す。

#### `consumeCharge(amount = 1)`
- **処理**: `charges` を減算する。

#### `repair(amount = null)`
- **処理**: `charges` を加算する。最大値は現在の `maxCharges`（強化込み）。

#### `upgrade(key, bonusAmount)`
- **処理**: `enhancement[key]` に値を加算する。

#### `getSnapshot()`
- **処理**: 保存・復元に必要な最小限のデータ（`uid`, `id`, `charges`, `enhancement`）を返す。

---

## 3. ロジック詳細

### 3.1 耐久度 0 (charges === 0) の扱い
- `charges` の概念（`maxCharges > 0`）があるアイテムにおいて、`charges` が 0 になった場合：
    - すべての性能プロパティは無効化される（加算値: 0 / 乗算値: 1.0 を返す）。
    - ただし **`mass` だけは物理的実体としてそのまま加算される。**

### 3.2 強化 (Enhancement) のルール
- 強化はマスタ値に対する「加算」を基本とする。
- `maxCharges` も強化対象であり、強化によって使用回数が増加した状態を `maxCharges` として公開する。
- UI（`UIComponents.js`）はこの `enhancement` オブジェクト内の値を参照してハイライト表示を行う。
