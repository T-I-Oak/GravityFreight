# Specification: DataManager Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: データプロバイダー。
- **責務**:
    - 外部データソース（マスタ）の保持。
    - 静的データ（アイテム、ストーリー、実績定義等）への統一されたアクセスインターフェースの提供。
    - セーブデータの永続化（LocalStorage）と管理。

## 2. インターフェース (Interface)

### 2.1 ライフサイクル (Lifecycle)
- **`loadAllData(): Promise<void>`**
    - 外部の JSON マスタデータをすべて非同期でロードし、内部に保持する。
    - `package.json` からバージョン情報を取得し、`app_metadata.json` の内容と統合して `AppMetadata` を構築する。
    - ロード失敗時はエラーを投げ、アプリケーションの起動を停止させる。

### 2.2 データアクセス (Data Access)
- **`getAppMetadata(): AppMetadata`**
    - アプリケーションのバージョン番号、コピーライト表記等のメタデータを返す。

- **`setSEVolume(value: number): void`**
    - SE（効果音）の音量設定（0.0 - 1.0）を内部に保持し、`localStorage` へ永続化する。

- **`getSEVolume(): number`**
    - 現在保持されている SE 音量を返す。

- **`setMapZoomRate(value: number): void`**
    - マップのズーム率を内部に保持し、`localStorage` へ永続化する。

- **`getMapZoomRate(): number`**
    - 現在保持されているマップズーム率を返す。

- **`getInitialSetup(): InitialSetupData`**
    - 新規ゲーム開始時の初期所持金、初期装備アイテムリストを返す。

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
  mapZoomRate: number  // マップのズーム率
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
