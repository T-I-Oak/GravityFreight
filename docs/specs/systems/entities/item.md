# Specification: Item

## 1. 概要 (Overview)

Item クラスは、ロケット構成パーツおよび発射装備（Chassis, Logic, Module, Launcher, Booster）の基体となるエンティティである。

- 生存期間: Exist Lifecycle (生成から消失まで)
- 役割: 属性（耐久度、強化状態）の保持と性能情報の提供
- 依存関係: DataManager

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

以下の項目はすべて個別の Getter を通じて公開される。性能に関連する項目は、内部で補正後の値を算出して返す。

| プロパティ | 型 | 説明 | 備考 |
| :--- | :--- | :--- | :--- |
| **識別・状態** | | | |
| uid | string | 個体識別用ID | |
| id | string | マスタ定義ID | |
| category | string | アイテムの分類 | |
| charges | number | 現在の残り回数/耐久度 | |
| enhancement | object | 項目ごとの強化回数 | key: count 形式 |
| enhancementCount | number | 累計強化回数 | |
| **基本情報** | | | |
| name | string | 表示名 | |
| rarity | number | レアリティ (5〜20) | |
| description | string | 説明文 | |
| **性能プロパティ** | | | |
| mass | number | 質量 | |
| slots | number | スロット提供数 | 強化対象 (+1) |
| precision | number | 予測精度（固定値加算） | |
| pickupRange | number | 回収範囲（固定値加算） | |
| precisionMultiplier | number | 予測精度の補正倍率 | 強化対象 (+0.2) |
| pickupMultiplier | number | 回収範囲の補正倍率 | 強化対象 (+0.2) |
| gravityMultiplier | number | 重力影響の補正倍率 | 強化対象 (-0.1) |
| powerMultiplier | number | 発射パワーの補正倍率 | |
| arcMultiplier | number | 出口判定エリアの補正倍率 | |
| power | number | 発射台の基礎パワー | |
| maxCharges | number | アイテムの最大耐久度 | 強化対象 (+1) |
| **特殊属性・フラグ** | | | |
| onLostBonus | boolean | ロスト保険フラグ | |
| ghostType | string | 予測線の表示タイプ | |
| duration | number | 効果持続時間 | |
| preventsLauncherWear | boolean | 発射台摩耗防止フラグ | |

### 2.2 メソッド (Methods)

#### constructor(uid, masterId, dynamicState = {})
DataManager からマスタ定義を取得し、プロパティを初期化する。

#### getStat(key)
指定された項目の最終的な性能値を算出する共通ロジック。
FinalValue = BaseValue + (enhancement[key] * StepValue)
※ 各性能プロパティの Getter は、内部的にこのメソッドを呼び出す。

#### upgrade(key)
enhancement[key] を +1 し、enhancementCount を更新する。

#### repair(amount = null)
charges を回復する。最大値は maxCharges。

#### getSnapshot()
シリアライズ用の動的データを返す。

## 3. ロジック詳細

### 3.1 耐久度 0 の扱い
charges が 0 の場合、mass を除くすべての性能プロパティは、加算値なら 0、乗算値なら 1.0 を返す。

### 3.2 強化増分 (Enhancement Step)
- slots: +1
- precisionMultiplier: +0.2
- pickupMultiplier: +0.2
- gravityMultiplier: -0.1 (最小値 0.1)
- maxCharges: +1
