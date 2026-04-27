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
  id: string,       // 一意の識別子 (例: 'hull_light')
  category: string, // カテゴリ (chassis, logic, launcher, module, booster, coin, cargo)
  name: string,     // 表示名
  rarity: number,   // レアリティ値 (1-20)
  description: string, // 説明文
  // --- カテゴリ固有プロパティ ---
  mass?: number,    // 質量
  slots?: number,   // スロット数
  power?: number,   // 射出パワー
  maxCharges?: number, // 最大耐久度/回数
  // ...他
}
```

### FacilityInfo
```javascript
{
  id: string,       // 短縮ID ('T', 'R', 'B')
  type: string,     // 施設タイプ ('TRADING_POST', 'REPAIR_DOCK', 'BLACK_MARKET')
  name: string,     // 表示名
  icon: string,     // 表示アイコン文字
  className: string // CSSクラス名
}
```

### GameBalanceConfig (主要なバランス定数)
```javascript
{
  DEFAULT_SHIP_MASS: number,     // ロケットの基本質量
  DELIVERY_REWARD: { SCORE: number, COINS: number }, // 正しい配送時の報酬
  UNMATCHED_DELIVERY_REWARD: { SCORE: number, COINS: number }, // 誤配送時の報酬
  MAX_COIN_DISCOUNT: number,     // コインによる最大割引率
  MAGNET_PULSE_GROWTH: number,   // 磁気パルス回収範囲の成長率
  GRAVITY_SCALING_FACTOR: number, // 重力の計算倍率
  TRAIL_MAX_LENGTH: number       // 航跡の最大保存数
}
```

### MapConstants (マップ生成定数)
```javascript
{
  BOUNDARY_RADIUS: number,    // セクターの境界半径
  MIN_STAR_DISTANCE: number,  // 天体間の最小距離
  HOME_STAR_RADIUS: number,   // ホーム（発射地点）の天体半径
  HOME_STAR_MASS: number      // ホーム天体の質量
}
```

### RaritySettings
```javascript
{
  COMMON: number,    // 一般 (5)
  UNCOMMON: number,  // 非凡 (10)
  RARE: number,      // 希少 (15)
  ANOMALY: number    // 異常 (20)
}
```

### StoryDefinition
```javascript
{
  branch: string, // 対応する施設ID ('T', 'R', 'B')
  step: number,   // 段階 (1, 2, 3)
  title: string,  // ストーリータイトル
  discovery: string, // 発見時のテキスト
  content: string // ストーリー本文
}
```

### AchievementDefinition
```javascript
{
  label: string, // 実績の表示ラベル
  tiers: [
    { goal: number, title: string }, // 目標値と称号
    // ...
  ]
}
```

## 5. 移行ロードマップ (Migration Roadmap)

マスタデータを JS ファイル (`Data.js`) から外部データ (`.json`) へ完全に移行するためのプロセス。

### Phase 1: 依存関係の集約 (Wrapper Phase) - [DONE]
- `DataManager` を実装し、インターフェースを統一。
- **完了**: 2026-04-27

### Phase 2: データの実体分離 (Extraction Phase) - [DONE]
- データを JSON ファイルとして分離。
- `DataManager` が JSON を静的に import する構成に移行。
- レガシーな `Data.js` および `AchievementData.js` を物理削除。
- **完了**: 2026-04-27

### Phase 3: 高度なデータ管理 (Optimization Phase) - [NEXT]
- JSON Schema によるデータ整合性チェックの導入。
- 多言語化対応が必要になった場合の、言語別ファイル切り替えロジック。
- データの遅延読み込み（必要時）の検討。
