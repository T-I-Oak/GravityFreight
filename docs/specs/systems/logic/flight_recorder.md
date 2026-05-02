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
    - `DataManager` から航行記録インデックス（過去の全記録の目録）を取得し、内部状態を初期化する。
    - 内部で `migrationMap` を定義し、`DataManager.getSavedFlightRecordIndex(migrationMap)` を呼び出す。

### 記録・再現 (Record & Replay)
- **`saveRecord(record: object): void`**
    - 今回の航行データを永続化保存し、インデックスにメタデータを追加して `DataManager.setSavedFlightRecordIndex()` で更新する。

- **`loadRecord(recordId: string): object`**
    - 指定されたIDの航行詳細データをロードして返す。

## 3. データ構造定義 (Data Structures)

### FlightRecordIndex (永続化対象)
```javascript
{
  records: {             // 航行記録のメタデータ集約
    "REC_20260502_001": {
      timestamp: number,
      sector: number,
      score: number,
      rocketConfig: object
    },
    ...
  }
}
```
