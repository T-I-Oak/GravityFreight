# Specification: DataManager (データマネージャー仕様書)

## 1. 概要 (Overview)
`DataManager` は、Gravity Freight V2 におけるすべての静的なマスタデータへの唯一のアクセスポイントを提供する。本クラスは App Lifecycle で生存し、データの保持と検索ロジックに責任を持つ。

## 2. 設計原則 (Design Principles)
- **Read-Only**: 提供されるデータはすべて読み取り専用であり、呼び出し側による変更は許可されない。
- **Encapsulation**: 内部のデータ構造（JS オブジェクト、JSON 等）は隠蔽され、メソッドを介してのみアクセス可能とする。
- **Fail-Fast**: 不正な ID 指定に対しては、沈黙せずに適切なエラーを投げる（Natural Failure を許容し、早期発見を促す）。

## 3. クラス・インターフェース (API)

### 3.1 アイテム関連 (Items)
アイテムカタログへのアクセス。

- **`getItemById(id: string): ItemDefinition`**
    - 全アイテムから指定された ID に一致する定義を返す。
    - ID が存在しない場合はエラーを投げる。
- **`getItemsByCategory(category: string): ItemDefinition[]`**
    - 指定されたカテゴリ（chassis, logic, launcher, module, booster, coin, cargo）のアイテムリストを返す。
- **`getAllItems(): ItemDefinition[]`**
    - 全アイテムのフラットなリストを返す。

### 3.2 施設関連 (Facilities)
拠点施設（Trading Post 等）の定義へのアクセス。

- **`getFacilityById(id: string): FacilityInfo`**
    - ID（'T', 'R', 'B'）に一致する施設情報を返す。

### 3.3 ストーリー・実績関連 (Content)
物語と実績解除の定義へのアクセス。

- **`getStoryById(id: string): StoryDefinition`**
    - 指定された ID のストーリーテキストやタイトルを返す。
- **`getAchievementById(id: string): AchievementDefinition`**
    - 指定された統計 ID に基づく実績ラベルと Tier 定義を返す。
- **`getAllAchievements(): AchievementDefinition[]`**
    - 全実績定義のリストを返す。

### 3.4 定数・バランス関連 (Configuration)
計算式や物理挙動に使用する定数へのアクセス。

- **`getGameBalance(): GameBalanceConfig`**
    - 報酬額や倍率、磁気パルスの成長率などのバランス定数を返す。
- **`getMapConstants(): MapConstants`**
    - セクター境界、天体質量、距離制限などのマップ生成定数を返す。
- **`getRaritySettings(): RaritySettings`**
    - レアリティごとの出現率、査定価格、およびセクターしきい値の設定を返す。

### 3.5 初期セットアップ (Setup)
新規ゲーム開始時の初期化用データ。

- **`getInitialSetup(): InitialSetupData`**
    - 初期インベントリ（アイテムIDリスト）および初期所持金を返す。

## 4. データ構造定義 (Data Structures)

### ItemDefinition
```javascript
{
  id: string,
  category: string,
  name: string,
  rarity: number,
  description: string,
  // 以下、カテゴリにより任意
  mass?: number,
  slots?: number,
  precision?: number,
  power?: number,
  maxCharges?: number,
  precisionMultiplier?: number,
  pickupMultiplier?: number,
  gravityMultiplier?: number,
  // ...他
}
```

### StoryDefinition
```javascript
{
  branch: string, // 'T' | 'R' | 'B'
  step: number,
  title: string,
  discovery: string,
  content: string
}
```

### AchievementDefinition
```javascript
{
  label: string,
  tiers: [
    { goal: number, title: string },
    // ...
  ]
}
```

## 5. 実装上の注意 (Implementation Notes)
- データの不変性を守るため、メソッドは内部データのコピーを返すか、`Object.freeze()` されたオブジェクトを返す必要がある。
- `Data.js` からの移行期間中は、内部で `Data.js` の定数をラップする形で実装し、徐々に独立させる。
