# Specification: Item

## 1. 概要 (Overview)

Item クラスは、ロケット構成パーツおよび発射装備（Chassis, Logic, Module, Launcher, Booster）の基体となるエンティティである。

- 生存期間: Exist Lifecycle (生成から消失まで)
- 役割: 属性（耐久度、強化状態）の保持と性能情報の提供
- 依存関係: DataManager

## 2. クラス定義 (Class Definition)

### 2.1 公開プロパティ (Public Properties)

外部から参照可能な、計算・補正済みのプロパティ。

| カテゴリ | 名前 | 型 | 説明 |
| :--- | :--- | :--- | :--- |
| **識別・状態** | uid | string | 個体識別用ID |
| | id | string | マスタ定義ID |
| | charges | number | 現在の残り回数/耐久度 |
| | enhancement | object | 項目ごとの強化回数 (key: count 形式) |
| | enhancementCount | number | 累計強化回数 |
| **表示・基本** | name | string | 表示名 |
| | category | string | カテゴリ |
| | rarity | string | レアリティ (common, uncommon, rare, anomaly) |
| | description | string | 説明文 |
| **性能数値** | mass | number | 質量 |
| | slots | number | スロット提供数 |
| | precision | number | 予測精度 |
| | pickupRange | number | 回収範囲 |
| | precisionMultiplier | number | 予測精度の補正倍率 |
| | pickupMultiplier | number | 回収範囲の補正倍率 |
| | gravityMultiplier | number | 重力影響の補正倍率 |
| | powerMultiplier | number | 発射パワーの補正倍率 |
| | arcMultiplier | number | 出口判定エリアの補正倍率 |
| | power | number | 発射台の基礎パワー |
| | maxCharges | number | 最大耐久度 |
| **フラグ・特殊** | onLostBonus | boolean | ロスト保険フラグ |
| | ghostType | string | 予測線の表示タイプ |
| | duration | number | 効果持続時間 |
| | preventsLauncherWear | boolean | 発射台摩耗防止フラグ |

### 2.2 内部プロパティ (Internal State)

クラス内部でのみ使用される非公開（または private）プロパティ。

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| #master | object | DataManager から取得したマスタ定義データの参照 |

### 2.3 メソッド (Methods)

#### constructor(uid, masterId)
`DataManager` からマスタ定義を取得し、各公開プロパティを初期化する。

#### applyMaintenance()
ランダムな修理または強化を実行し、該当する公開プロパティを更新する（詳細は [3.2]）。実行内容を戻り値として返す。

#### repair(amount = 1)
`charges` を指定量回復する（最大 `maxCharges`）。

#### getSnapshot()
シリアライズ用の動的データ（uid, id, charges, enhancement）を返す。

## 3. ロジック詳細

### 3.1 耐久度 0 の扱い
charges が 0 の場合、外部（Rocketクラス等）の性能集計ロジックにおいて、mass を除く各プロパティ値を無効化（0 または 1.0）として扱う。本クラス内のプロパティ値自体は不変に保つ。

### 3.2 強化候補と増分 (Enhancement Step)
| 項目 | 増分 | 抽出条件 |
| :--- | :--- | :--- |
| slots | +1 | なし (常に候補) |
| precisionMultiplier | +0.2 | なし (常に候補) |
| pickupMultiplier | +0.2 | なし (常に候補) |
| gravityMultiplier | -0.1 | 元のマスタ値が存在し、かつ現在の値 > 0.1 |
| maxCharges | +1 | 元のマスタ値が存在する |
