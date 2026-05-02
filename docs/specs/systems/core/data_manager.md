# Specification: DataManager Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: データプロバイダー。
- **責務**:
    - **マスタデータの管理**: 静的データ（アイテムカタログ、抽選テーブル定数、初期設定等）の保持と提供。
    - **永続化管理**: 設定（音量等）や進行実績（最高スコア等）の `LocalStorage` への読み書き。
    - ※ 進行中のゲームステート（現在のセクター、所持金等）は管理対象外。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`loadAllData(): Promise<void>`**
    - 外部の JSON マスタデータをすべて非同期でロードし、内部に保持する。
    - `package.json` からバージョン情報を取得し、`app_metadata.json` の内容と統合して `AppMetadata` を構築する。
    - `localStorage` から前回プレイ時のバージョン（`lastPlayedVersion`）を読み込む。※データが存在しない、または読み込みに失敗した場合は `null` となり、致命的なエラーとはみなさない。
    - **外部マスタデータのロード失敗時**はエラーを投げ、アプリケーションの起動を停止させる。
    - ロードおよびマイグレーション完了後、`_updateLastPlayedVersion()` を呼び出し、最新のバージョン情報を `localStorage` へ保存する。

### データアクセス (Data Access)
- **`getMasterAppMetadata(): AppMetadata`**
    - アプリケーションのバージョン番号、コピーライト表記等のメタデータを返す。

### ユーザーデータ（Saved Data）
※ 以下の `getSaved*` メソッドは、すべて共通の「マイグレーション付き取得フロー」に従う。

**共通ルール：マイグレーション付き取得フロー**
1. `localStorage` から指定のキーでデータを取得する。
2. データが存在しない場合、引数の `migrationMap.init()` を実行して結果を返す。
3. データが存在する場合、内部メソッド `_migrate(data, migrationMap)` を通じて最新化されたデータを返す。

- **`getSavedSEVolume(migrationMap: object): object`**
    - 「共通ルール」に基づき、SE 音量設定を取得する。

- **`setSavedSEVolume(data: object): void`**
    - SE（効果音）の音量を `localStorage` へ永続化する。

- **`getSavedCameraState(migrationMap: object): object`**
    - 「共通ルール」に基づき、カメラの状態を取得する。

- **`setSavedCameraState(data: object): void`**
    - カメラの状態を `localStorage` へ永続化する。

- **`getSavedStoryProgress(migrationMap: object): object`**
    - 「共通ルール」に基づき、ストーリー進捗データを取得する。

- **`setSavedStoryProgress(data: object): void`**
    - ストーリー進捗データを `localStorage` へ永続化する。

- **`getSavedAchievementData(migrationMap: object): object`**
    - 「共通ルール」に基づき、累計統計・実績データを取得する。

- **`getSavedFlightRecordIndex(migrationMap: object): object`**
    - 「共通ルール」に基づき、航行記録インデックス（過去の全記録の目録）を取得する。

- **`getMasterInitialSetup(): InitialSetupData`**
    - 新規ゲーム開始時の初期所持金、初期装備アイテムリストを返す。

- **`getMasterConfig(): MasterConfigData`**
    - ゲーム全体のバランス調整用定数（ベース星数、境界半径等）を返す。

## 3. データ構造定義 (Data Structures)

### AppMetadata
```javascript
{
  appName: string,
  copyright: string,
  version: string // package.json からの動的取得
}
```

### InitialSetupData
```javascript
{
  initialMoney: number,
  initialInventory: [
    { uid: string, durability: number }, // 初期パーツと耐久度
    ...
  ]
}
```

### MasterConfigData
```javascript
{
  baseStarCount: number,        // 初期天体数
  boundaryRadius: number,       // セクター境界半径
  anomalySectorInterval: number, // アノマリー発生間隔（5セクター毎など）
  blackMarketVisitValue: number // 闇市場訪問時の天体増加量
}
```

## 4. 内部ロジック (Internal Logic)

### 内部ステート (Internal State)
- **`lastPlayedVersion: string`**: 起動時に `localStorage` から読み取った前回プレイ時のバージョン（存在しない場合は `null`）。
- **`currentVersion: string`**: `package.json` から読み取った現在のアプリバージョン。

### 内部メソッド (Private Methods)
- **`_migrate(data: object, migrationMap: object): object`**
    1. `migrationMap` のキーから `init` を除外したバージョン文字列のリストを抽出する。
    2. 抽出したリストを `_compareVersions` を用いて昇順（SemVer順）にソートする。
    3. ソートされたバージョンのうち、`lastPlayedVersion` よりも新しい（`> lastPlayedVersion`）ものに対応する callback を順次 `data` に適用していく。
    4. すべての適用が完了した最新状態の `data` を返す。

- **`_compareVersions(v1: string, v2: string): number`**
    - 2つのバージョン文字列をセマンティックバージョニングに基づき比較する（v1 < v2 なら -1, 一致なら 0, v1 > v2 なら 1）。

- **`_updateLastPlayedVersion(): void`**
    - `localStorage` に保存されているバージョン情報を、現在の `currentVersion` で上書き更新する。

## 5. マスタデータ構成 (Master Data Structure)

### `app_metadata.json`
- **構造**: `{ "appName": string, "copyright": string }`
- **備考**: `version` は実行時に `package.json` から注入される。

### `initial_setup.json`
- **構造**:
  ```javascript
  {
    "initialMoney": 1000,
    "initialInventory": [
      { "uid": "launcher_standard", "durability": 10 },
      ...
    ]
  }
  ```

### `config.json`
- **構造**:
  ```javascript
  {
    "baseStarCount": 5,
    "boundaryRadius": 5000,
    "anomalySectorInterval": 5,
    "blackMarketVisitValue": 1
  }
  ```

### `items.json`
- **構造**:
  ```javascript
  {
    "items": {
      "item_uid": {
        "name": string,
        "type": "launcher" | "booster" | "module",
        "params": { ... }
      }
    }
  }
  ```

### `world_config.json`
- **構造**:
  ```javascript
  {
    "sectorProbabilities": { "anomaly": 0.1 },
    "itemLotteryTables": {
      "standard": [ { "uid": "item_a", "weight": 10 }, ... ]
    }
  }
  ```

### `stories.json`
- **構造**:
  ```javascript
  {
    "messages": {
      "story_id": {
        "type": "T" | "R" | "B",
        "text": string
      }
    }
  }
  ```
