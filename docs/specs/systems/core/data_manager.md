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
    - `localStorage` から前回プレイ時のバージョン（`lastPlayedVersion`）を読み込む。
    - ロード失敗時はエラーを投げ、アプリケーションの起動を停止させる。

### データアクセス (Data Access)
- **`getMasterAppMetadata(): AppMetadata`**
    - アプリケーションのバージョン番号、コピーライト表記等のメタデータを返す。

- **`getSavedSEVolume(): number`**
    - 現在保持されている SE 音量を返す。

- **`setSavedSEVolume(value: number): void`**
    - SE（効果音）の音量設定（0.0 - 1.0）を内部に保持し、`localStorage` へ永続化する。

- **`getSavedCameraState(): CameraState`**
    - 現在保持されているカメラの状態を返す。

- **`setSavedCameraState(state: CameraState): void`**
    - カメラの状態（位置、回転、ズーム等）をまとめて内部に保持し、`localStorage` へ永続化する。

- **`getSavedStoryProgress(migrationMap: object): object`**
    - ストーリー進捗データを取得し、必要に応じて提供された `migrationMap` を用いて最新バージョンへマイグレーションした結果を返す。
    - データが存在しない場合は `migrationMap.init()` の結果を返す。

- **`setSavedStoryProgress(data: object): void`**
    - 最新のストーリー進捗データを `localStorage` へ永続化する。保存時、現在のアプリバージョンをメタデータとして付与する。

- **`getMasterInitialSetup(): InitialSetupData`**
    - 新規ゲーム開始時の初期所持金、初期装備アイテムリストを返す。

- **`getMasterConfig(): MasterConfigData`**
    - ゲーム全体のバランス調整用定数（ベース星数、境界半径等）を返す。

## 3. 内部ロジック (Internal Logic)

### 内部ステート (Internal State)
- **`lastPlayedVersion: string`**: 起動時に `localStorage` から読み取った前回プレイ時のバージョン（存在しない場合は `null`）。
- **`currentVersion: string`**: `package.json` から読み取った現在のアプリバージョン。
- **`versionRoadmap: string[]`**: リリース済みの全バージョンが昇順で並んだリスト（マスタデータとして保持）。

### 内部メソッド (Private Methods)
- **`_migrate(data: object, migrationMap: object): object`**
    - `lastPlayedVersion` から `currentVersion` までの差分バージョンを `versionRoadmap` から抽出する。
    - 抽出された各バージョンに対応する callback が `migrationMap` にあれば、順次 `data` に適用していく。
    - 最終的な `data` に最新の `version` を付与して返す。

- **`_compareVersions(v1: string, v2: string): number`**
    - 2つのバージョン文字列をセマンティックバージョニングに基づき比較する（v1 < v2 なら -1, 一致なら 0, v1 > v2 なら 1）。

- **`_updateLastPlayedVersion(): void`**
    - 保存処理が行われた際、`lastPlayedVersion` を `currentVersion` で更新し、`localStorage` にも同期する。



## 3. データ構造定義 (Data Structures)

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

## 4. マスタデータ構成 (Master Data Configuration)

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
