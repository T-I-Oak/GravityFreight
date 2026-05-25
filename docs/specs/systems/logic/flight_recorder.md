# Specification: FlightRecorder Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: 航行記録・リプレイ管理。
- **責務**:
    - 1回の航行単位のスナップショットをリプレイ用に永続化保存する。
    - 保存済み航行記録の再現を実行する。
    - ゲーム1プレイ単位のランキング記録は担当しない。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `GameDataRepository` から**航行記録インデックス（目録）**を取得し、内部状態を初期化する。
    - **内部実装詳細**:
        1. `MigrationMap`（GameDataRepository 仕様参照）を定義する。
           - `init()` はデフォルトの空のインデックスオブジェクトを返す。
        2. `GameDataRepository.getSavedFlightRecordIndex(migrationMap)` を呼び出す。

### 航行記録 (Flight Replay Record)

- **`recordFlightResult(context: object): FlightRecord | null`**
    - 1回の航行終了時に、リプレイ用の航行記録を確定する。
    - **呼び出しタイミング**: `GameController.handleNavigationEnd()` 内で、航行結果とスナップショットが確定した時点。
    - **入力**:
        - 航行結果。
        - 航行スコア。
        - 到達セクター。
        - 発射時点のロケット構成スナップショット。
        - セクター状態スナップショット。
    - **保存**:
        - 保存対象になった場合は、`GameDataRepository.setSavedFlightRecordIndex(data)` で永続化する。
        - 保存対象外で、航行結果画面でお気に入り登録もされなかった場合、そのリプレイデータは航行結果画面を抜けた時点で破棄する。

## 3. データ構造定義 (Data Structures)

### FlightRecordIndex (永続化対象: キー `flight_record_index`)
```javascript
{
  // 構造は将来の航行記録仕様策定時に確定する
}
```

### FlightRecord
1回の航行単位のリプレイ記録。
```javascript
{
  id: string,
  createdAt: string,
  score: number,
  reachedSector: number,
  favorite: boolean,
  snapshots: object
}
```
