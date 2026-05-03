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
    - 「共通ルール」に基づき、実績・統計データを取得する。

- **`setSavedAchievementData(data: object): void`**
    - 実績・統計データを `localStorage` へ永続化する。

- **`getSavedFlightRecordIndex(migrationMap: object): object`**
    - 「共通ルール」に基づき、航行記録インデックスを取得する。

- **`setSavedFlightRecordIndex(data: object): void`**
    - 航行記録インデックスを `localStorage` へ永続化する。

- **`getMasterInitialSetup(): InitialSetupData`**
    - 新規ゲーム開始時の初期所持金、初期装備アイテムリストを返す。

- **`getMasterConfig(): MasterConfigData`**
    - ゲーム全体のバランス調整用定数（ベース星数、境界半径等）を返す。

## 3. 内部ロジック (Internal Logic)

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



## 4. データ構造定義 (Data Structures)

### AppMetadata
```javascript
{
  version: string,    // 接頭辞を含んだ表示用バージョン文字列 (例: "v2.0.0")
  copyright: string   // コピーライト表記
}
```

### UserSettings
```javascript
{
  seVolume: number,    // SE音量 (0.0 - 1.0)
  cameraState: CameraState // カメラの視点状態
}
```

### CameraState
```javascript
{
  position: { x: number, y: number }, // パン位置
  rotation: number,                   // 回転角 (ラジアン)
  zoom: number                        // ズーム倍率
}
```

### InitialSetupData
```javascript
{
  initialCoins: number,     // 初期所持金
  initialInventory: string[] // 初期アイテムIDリスト
}
```

### MasterConfigData
```javascript
{
  baseCelestialCount: number, // 1セクターのベース天体数 (初期値: 5)
  boundaryRadius: number      // セクター境界半径 (单位: px、初期値: 900)
}
```

## 5. マスタデータ構成 (Master Data Configuration)

`loadAllData()` によって読み込まれる外部ファイルの構成案。

### `app_metadata.json`
※ `version` は `package.json` から取得し、`copyright` は本ファイルで定義する。

```json
{
  "copyright": "©2026 T.I.OAK"
}
```

### `initial_setup.json`
```json
{
  "initialCoins": 1200,
  "initialInventory": ["hull_matte", "logic_basic", "launcher_spring"]
}
```

### `master_config.json`
```json
{
  "baseCelestialCount": 5,
  "boundaryRadius": 900
}
```
