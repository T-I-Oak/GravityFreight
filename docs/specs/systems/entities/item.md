# Specification: Item

## 1. 概要 (Overview)

Item クラスは、ロケット構成パーツおよび発射装備（Chassis, Logic, Module, Launcher, Booster）の基体となるエンティティである。

- 生存期間: Exist Lifecycle (生成から消失まで)
- 役割: 属性（耐久度、強化状態）の保持と性能情報の提供
- 依存関係: DataManager

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

以下のプロパティは、生成時および強化時に「最終的な値」が計算・保持される。

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| uid | string | 個体識別用ID |
| id | string | マスタ定義ID |
| charges | number | 現在の残り回数/耐久度 |
| enhancement | object | 項目ごとの強化回数 (key: count 形式) |
| enhancementCount | number | 累計強化回数 |
| name | string | 表示名 |
| category | string | カテゴリ |
| rarity | string | レアリティ (common, uncommon, rare, anomaly) |
| description | string | 説明文 |
| mass | number | 質量 |
| slots | number | スロット提供数 |
| precision | number | 予測精度 |
| pickupRange | number | 回収範囲 |
| precisionMultiplier | number | 予測精度の補正倍率 |
| pickupMultiplier | number | 回収範囲の補正倍率 |
| gravityMultiplier | number | 重力影響の補正倍率 |
| powerMultiplier | number | 発射パワーの補正倍率 |
| arcMultiplier | number | 出口判定エリアの補正倍率 |
| power | number | 発射台の基礎パワー |
| maxCharges | number | アイテムの最大耐久度 |
| onLostBonus | boolean | ロスト保険フラグ |
| ghostType | string | 予測線の表示タイプ |
| duration | number | 効果持続時間 |
| preventsLauncherWear | boolean | 発射台摩耗防止フラグ |

### 2.2 メソッド (Methods)

#### constructor(uid, masterId)
DataManager からマスタ定義を取得し、プロパティを初期化する。初期状態では enhancement は空（全項目 0）であり、charges は初期の maxCharges と等しい。

#### applyMaintenance()
要求仕様（拠点機能: 整備工場）に基づく修理または強化を自動的に実行する。戻り値として実行された内容（項目名または "repair"）を返す。
- **修理判定**: maxCharges > 0 かつ charges < maxCharges の場合、`repair()` を実行。
- **強化実行**: 修理対象でない場合、強化可能な候補（[3.2] 参照）からランダムに 1 つを選択し、値を更新して `enhancementCount` を +1 する。

#### repair(amount = 1)
charges を指定量回復する。最大値は現在の maxCharges。強化回数にはカウントされない。

#### getSnapshot()
シリアライズ用の動的データ（uid, id, charges, enhancement）を返す。

## 3. ロジック詳細

### 3.1 耐久度 0 の扱い
charges が 0 の場合、外部に提供する性能値（集計用）は無効化されるべきであるが、Item インスタンス内部のプロパティ値自体は変更せず、集計ロジック側で charges を参照して判定することを基本とする。

### 3.2 強化候補と増分 (Enhancement Step)
強化時に選択される候補およびその増分は以下の通り。

| 項目 | 増分 | 抽出条件 |
| :--- | :--- | :--- |
| slots | +1 | なし (常に候補) |
| precisionMultiplier | +0.2 | なし (常に候補) |
| pickupMultiplier | +0.2 | なし (常に候補) |
| gravityMultiplier | -0.1 | 元のマスタ値が存在し、かつ現在の値 > 0.1 |
| maxCharges | +1 | 元のマスタ値が存在する |
