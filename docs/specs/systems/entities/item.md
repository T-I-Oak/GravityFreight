# Specification: Item

## 1. 概要 (Overview)

Item クラスは、ロケット構成パーツおよび発射装備（Chassis, Logic, Module, Launcher, Booster）の基体となるエンティティである。

- 生存期間: Exist Lifecycle (生成から消失まで)
- 役割: 属性（耐久度、強化状態）の保持と性能情報の提供
- 依存関係: DataManager

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

インスタンス内部で保持される動的状態。

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| uid | string | 個体識別用ID |
| id | string | マスタ定義ID |
| charges | number | 現在の残り回数/耐久度 |
| enhancement | object | 項目ごとの強化回数 (key: count 形式) |
| enhancementCount | number | 累計強化回数 |

### 2.2 メソッドと Getter (Methods & Getters)

以下の項目は Getter として実装され、マスタ値に強化補正を加えた最終値を返す。

#### Getters: 性能プロパティ
- **get mass()**: 質量を返す。
- **get slots()**: スロット提供数を返す (強化対象: +1/回)。
- **get precision()**: 予測精度を返す。
- **get pickupRange()**: 回収範囲を返す。
- **get precisionMultiplier()**: 予測精度の補正倍率を返す (強化対象: +0.2/回)。
- **get pickupMultiplier()**: 回収範囲の補正倍率を返す (強化対象: +0.2/回)。
- **get gravityMultiplier()**: 重力影響の補正倍率を返す (強化対象: -0.1/回, 最小0.1)。
- **get powerMultiplier()**: 発射パワーの補正倍率を返す。
- **get arcMultiplier()**: 出口判定エリアの補正倍率を返す。
- **get power()**: 発射台の基礎パワーを返す。
- **get maxCharges()**: 最大耐久度を返す (強化対象: +1/回)。

#### Getters: 基本情報・フラグ
- **get name()**: 表示名を返す。
- **get category()**: カテゴリを返す。
- **get rarity()**: レアリティを返す。
- **get description()**: 説明文を返す。
- **get onLostBonus()**: ロスト保険フラグを返す。
- **get ghostType()**: 予測線の表示タイプを返す。
- **get duration()**: 効果持続時間を返す。
- **get preventsLauncherWear()**: 発射台摩耗防止フラグを返す。

#### upgrade(key)
指定されたキーの強化回数を +1 し、累計強化回数を更新する。

#### repair(amount = null)
charges を回復する。最大値は maxCharges。

#### getSnapshot()
シリアライズ用の動的データ（uid, id, charges, enhancement）を返す。

## 3. ロジック詳細

### 3.1 耐久度 0 の扱い
charges が 0 の場合、mass を除くすべての性能プロパティは、加算値なら 0、乗算値なら 1.0 を返す。

### 3.2 強化計算
最終値 = マスタ値 + (強化回数 * 増分)
※ gravityMultiplier のみ減算（最小 0.1）。
