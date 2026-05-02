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

### データ取得 (Data Access)
- **`getRecordIndex(): object`**
    - 過去の航行記録のメタデータ一覧（目録）を返す。記録画面の一覧表示等で使用される。

## 3. データ構造定義 (Data Structures)

### FlightRecordIndex (永続化対象)
- **ステータス**: 未定（各ドメインの仕様策定時に定義する）。
- **初期値**: `{}`（空のオブジェクト）。
- **備考**: 初期化（ロード）ができることのみを現時点で保証する。
