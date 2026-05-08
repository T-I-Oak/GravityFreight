# Specification: FlightRecorder Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: 記録・リプレイ。
- **責務**:
    - スナップショットの永続化保存。
    - 再現の実行。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `DataManager` から**航行記録インデックス（目録）**を取得し、内部状態を初期化する。
    - **内部実装詳細**:
        1. `MigrationMap`（DataManager 仕様参照）を定義する。
           - `init()` はデフォルトの空のインデックスオブジェクトを返す。
        2. `DataManager.getSavedFlightRecordIndex(migrationMap)` を呼び出す。

## 3. データ構造定義 (Data Structures)

### FlightRecordIndex (永続化対象: キー `flight_record_index`)
```javascript
{
  // 構造は将来の航行記録仕様策定時に確定する
}
```
