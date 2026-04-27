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
| **性能数値** | mass | number | 質量 (デフォルト 0) |
| | slots | number | スロット提供数 (デフォルト 0) |
| | precision | number | 予測精度 (デフォルト 0) |
| | pickupRange | number | 回収範囲 (デフォルト 0) |
| | precisionMultiplier | number | 予測精度の補正倍率 (デフォルト 1.0) |
| | pickupMultiplier | number | 回収範囲の補正倍率 (デフォルト 1.0) |
| | gravityMultiplier | number | 重力影響の補正倍率 (デフォルト 1.0) |
| | powerMultiplier | number | 発射パワーの補正倍率 (デフォルト 1.0) |
| | arcMultiplier | number | 出口判定エリアの補正倍率 (デフォルト 1.0) |
| | power | number | 発射台の基礎パワー (デフォルト 0) |
| | maxCharges | number | 最大耐久度 (デフォルト 0) |
| **フラグ・特殊** | onLostBonus | boolean | ロスト保険フラグ (デフォルト false) |
| | ghostType | string | 予測線の表示タイプ |
| | duration | number | 効果持続時間 (デフォルト 0) |
| | preventsLauncherWear | boolean | 発射台摩耗防止フラグ (デフォルト false) |

### 2.2 内部プロパティ (Internal State)

クラス内部でのみ使用される非公開プロパティ。

| 名前 | 型 | 説明 |
| :--- | :--- | :--- |
| #master | object | DataManager から取得したマスタ定義データの参照 |

### 2.3 メソッド (Methods)

#### constructor(masterId)
DataManager からマスタ定義を取得し、プロパティを初期化する。
- **識別子生成**: インスタンス生成時に、一意な `uid` を自動生成して付与する。
- **補完ルール**: マスタ定義で未定義（undefined）の項目は、以下のデフォルト値で初期化する。
    - 加算系プロパティ (`slots`, `maxCharges`, `power`, `precision`, `pickupRange`, `duration` 等): `0`
    - 乗算系プロパティ (`precisionMultiplier`, `pickupMultiplier`, `gravityMultiplier`, `powerMultiplier`, `arcMultiplier`): `1.0`
    - フラグ系プロパティ (`onLostBonus`, `preventsLauncherWear`): `false`
- **初期状態**: enhancement は空（全項目 0）であり、charges は初期の maxCharges と等しい。

#### equals(otherItem)
引数で渡された `Item` インスタンスと、`id` および「性能数値（補足後の最終値）」の全項目が完全に一致しているかを確認し、真偽値を返す。`uid` が異なっていても、同性能のアイテムであれば `true` となる。

#### applyMaintenance()
要求仕様に基づくランダムな修理または強化を実行する。戻り値として実行された内容（項目名または "repair"）を返す。
1. **候補選定**: 強化可能な項目（[3.2] 参照）からランダムに 1 つを抽選する。
2. **特殊判定 (耐久性)**: `maxCharges` が選出された場合
   - `charges < maxCharges` であれば、`repair()` を実行。強化回数（enhancementCount）は加算しない。
   - `charges === maxCharges` であれば、`maxCharges` を +1 し、あわせて `charges` も +1 する。その後、強化回数を加算する。
3. **通常強化**: それ以外が選出された場合
   - 選択された項目の enhancement[key] を +1 し、値を更新して強化回数を加算する。

#### repair(amount = 1)
charges を指定量回復し、更新後の charges を返す。最大値は現在の maxCharges。強化回数にはカウントされない。

#### consumeCharge(amount = 1)
charges を指定量減らし、更新後の charges を返す。最小値は 0。

#### getSnapshot()
永続化（保存）および再構築に必要な、プレーンなオブジェクトを返す。
- 含めるプロパティ: `uid`, `id`, `charges`, `maxCharges`, `enhancement`

#### static fromSnapshot(data)
スナップショットデータからインスタンスを再構築（Hydration）して返す。
- **処理**:
    1. `data.id` で constructor を呼び出し、新たなインスタンスを生成する。
    2. 生成されたインスタンスの `uid` を、保存されていた `data.uid` で上書きする。
    3. `charges`, `maxCharges`, `enhancement` を反映し、各性能プロパティを再計算する。

## 3. ロジック詳細

### 3.1 耐久度 0 の扱い
charges が 0 の場合、外部に提供する性能値（集計用）は無効化されるべきであるが、Item インスタンス内部のプロパティ値自体は変更せず、集計ロジック側で charges を参照して判定することを基本とする。
※ **mass および maxCharges は、耐久度 0 の影響を受けず、常に本来の値を維持する。**

### 3.2 強化候補と増分 (Enhancement Step)
強化時に選択される候補およびその増分は以下の通り。

| 項目 | 増分 | 抽出条件 |
| :--- | :--- | :--- |
| slots | +1 | なし (常に候補) |
| precisionMultiplier | +0.2 | なし (常に候補) |
| pickupMultiplier | +0.2 | なし (常に候補) |
| gravityMultiplier | -0.1 | 元のマスタ値が存在し、かつ現在の値 > 0.1 |
| maxCharges | +1 | 元のマスタ値が存在する |
