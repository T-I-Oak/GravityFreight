# Specification: GameDataRepository Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: GravityFreight のデータアクセス統合窓口。
- **責務**:
    - 静的なゲームマスタデータ（アイテム定義、初期設定、ゲームバランス定数など）をロードし、各クラスへ提供する。
    - ユーザーデータの保存・読込を、GameWorks OAK 共通ライブラリの `DataManager` を通じて行う。
    - GravityFreight 内の各クラスが、共通 `DataManager` や `localStorage` に直接依存しないようにする。
    - 多言語リソースの展開は GameWorks OAK 共通 i18n ライブラリに委譲し、GravityFreight 独自の言語展開ロジックを持たない。
    - 言語設定の保存は共通 i18n ライブラリの責務であり、GravityFreight のユーザーデータ保存領域とは分離する。

## 2. ライフサイクル

- **`constructor(commonDataManager: DataManager)`**
    - 共通ライブラリの `DataManager` インスタンスを受け取り、ユーザーデータ永続化の内部依存として保持する。

- **`loadAllData(): Promise<void>`**
    - GravityFreight の静的マスタデータをロードし、内部に保持する。
    - `lang-store` を含む表示リソースは、共通 i18n ライブラリのロード・展開 API を通じて取得する。
    - 外部マスタデータのロード失敗時はエラーを投げ、アプリケーションの起動を停止させる。

## 3. マスタデータ取得

- **`getInitialSetup(): InitialSetupData`**
    - 新規ゲーム開始時の初期所持金、初期アイテムIDリストを返す。

- **`getMasterConfig(): MasterConfigData`**
    - セクター生成、カメラ判定、出口判定などで使用するゲームバランス定数を返す。

- **`getItemDefinition(id: string): object`**
    - 指定されたアイテムIDのマスタ定義を返す。

- **`getStoryContent(id: string): object`**
    - 指定されたストーリーIDの表示用ストーリーデータを返す。
    - 戻り値のテキストは、共通 i18n ライブラリにより現在のアクティブ言語へ展開済みの値とする。

- **`getHowToPlayContent(): object[]`**
    - 説明書画面の 7 ページ分の表示用コンテンツを返す。
    - 戻り値のテキストは、共通 i18n ライブラリにより現在のアクティブ言語へ展開済みの値とする。
    - `HowToPlayUI` が共通 i18n の内部構造へ直接依存しないよう、表示に必要な `title`, `background`, `layout`, `blocks` を解決済みのデータとして提供する。

- **`getAchievementDefinitions(): object[]`**
    - 実績定義の一覧を返す。

- **`getAppMetadata(): AppMetadata`**
    - アプリケーションのバージョン番号、コピーライト表記等のメタデータを返す。

## 4. ユーザーデータ取得・保存

以下のメソッドは、内部で共通 `DataManager.getSavedData(key, migrationMap)` / `setSavedData(key, data)` を使用する。

- **`getSavedSEVolume(migrationMap: MigrationMap): object`**
- **`setSavedSEVolume(data: object): void`**
- **`getSavedCameraState(migrationMap: MigrationMap): object`**
- **`setSavedCameraState(data: object): void`**
- **`getSavedStoryProgress(migrationMap: MigrationMap): object`**
- **`setSavedStoryProgress(data: object): void`**
- **`getSavedAchievementData(migrationMap: MigrationMap): object`**
- **`setSavedAchievementData(data: object): void`**
- **`getSavedRankData(migrationMap: MigrationMap): object`**
- **`setSavedRankData(data: object): void`**
- **`getSavedFlightRecordIndex(migrationMap: MigrationMap): object`**
    - 内部で `DataManager.getSavedData('flight_record_index', migrationMap)` を呼び出す。
    - 戻り値は `FlightRecorder` が所有する `FlightRecordIndex` 構造とする。
- **`setSavedFlightRecordIndex(data: object): void`**
    - 内部で `DataManager.setSavedData('flight_record_index', data)` を呼び出す。
    - `pendingRecordDraft` や `pendingRecord` などの一時状態は保存対象に含めない。

## 5. 保存対象の分担

- `achievement_data`
    - 所有: `AchievementTracker`
    - 内容: 実績の達成状況と進捗。
- `rank_data`
    - 所有: `RankTracker`
    - 内容: スコア、到達セクター、回収数などの上位記録。
- `flight_record_index`
    - 所有: `FlightRecorder`
    - 内容: 航行単位のリプレイ記録インデックス。
- `story_progress`
    - 所有: `StorySystem`
    - 内容: 物語進行と既読状態。
- `camera_state`
    - 所有: `CameraController`
    - 内容: パン、ズーム、回転などの表示状態。
- `se_volume`
    - 所有: `SoundController`
    - 内容: 効果音音量。

## 6. データ構造定義

### MigrationMap
```javascript
{
  init: () => object,
  [version: string]: (data: object) => object
}
```

### AppMetadata
```javascript
{
  version: string,
  copyright: string
}
```

### InitialSetupData
```javascript
{
  initialCoins: number,
  initialInventory: string[]
}
```

### MasterConfigData
```javascript
{
  baseCelestialCount: number,
  boundaryRadius: number,
  placementLimitRadius: number,
  minBodyDistance: number,
  homeStarRadius: number,
  homeStarMass: number,
  arcFacilityWidths: {
    TRADING_POST: number,
    REPAIR_DOCK: number,
    BLACK_MARKET: number
  },
  arcMaxExpansion: number,
  arcMinMargin: number
}
```
