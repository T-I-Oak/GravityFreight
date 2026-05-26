# Specification: FlightRecorder Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: 航行記録・リプレイ管理。
- **責務**:
    - 1回の航行単位のスナップショットをリプレイ用に永続化保存する。
    - 保存済み航行記録から、航行開始時点の初期状態を復元する。
    - 復元した初期状態を `PhysicsEngine` に渡し、同一の物理シミュレーションとして再生できる状態を提供する。
    - ゲーム1プレイ単位のランキング記録は担当しない。

## 2. リプレイ再現方針

- リプレイは録画データではなく、発射時点の初期状態から物理シミュレーションを再実行して再現する。
- tick ごとの位置履歴、航跡、入力ログ、乱数 seed は保存しない。
- 発射後の航行結果へ影響するプレイヤー入力やランダム要素は存在しないため、発射時点の `Rocket` と `Sector` が復元できれば航行は完全に再現できる。
- `FlightRecorder` は snapshot の集約と保存枠管理を担当し、各 snapshot の具体フィールドは所有クラスの仕様に従う。
- snapshot は `createSnapshot()` を持つ各クラスが生成し、復元は対応する `fromSnapshot()` へ委譲する。
- snapshot はリプレイ専用の差分形式ではなく、そのクラスが所有する状態を復元するための構造とする。ただし、`Rocket.clone()` のような用途固有の clone API を全クラスへ一般化するものではない。

## 3. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `GameDataRepository` から**航行記録インデックス（目録）**を取得し、内部状態を初期化する。
    - **内部実装詳細**:
        1. `MigrationMap`（GameDataRepository 仕様参照）を定義する。
           - `init()` はデフォルトの空のインデックスオブジェクトを返す。
        2. `GameDataRepository.getSavedFlightRecordIndex(migrationMap)` を呼び出す。

### 航行記録 (Flight Replay Record)

- **`captureLaunchSnapshot(rocket: Rocket, sector: Sector): void`**
    - 発射確定時点のリプレイ再現用 snapshot を作成し、航行終了まで一時保持する。
    - **呼び出しタイミング**: `GameController` が発射を確定し、航行開始状態の `Rocket` と `Sector` が確定した直後。
    - **内部挙動**:
        1. `rocket.createSnapshot()` を呼び出し、発射時点の `RocketSnapshot` を取得する。
        2. `sector.createSnapshot()` を呼び出し、発射時点の `SectorSnapshot` を取得する。
        3. 取得した snapshot を `pendingRecordDraft` として保持する。
    - **注意**: `GameController` は発射タイミングを通知するだけで、snapshot の内部構造を解釈しない。

- **`recordFlightResult(result: FlightResultContext): FlightRecord | null`**
    - 1回の航行終了時に、リプレイ用の航行記録を確定する。
    - **呼び出しタイミング**: `GameController.handleNavigationEnd()` 内で、航行結果が確定した時点。
    - **入力**:
        - 航行結果種別。
        - 航行スコアおよび航行終了時に確定した最終スコア。
        - 到達セクター。
        - 到達先施設タイプまたは終了対象。
    - **入力に含めないもの**:
        - 発射時点の `Rocket` スナップショット。
        - 発射時点の `Sector` スナップショット。
        - これらは `captureLaunchSnapshot()` が作成し、`FlightRecorder` 内で一時保持している `pendingRecordDraft` を使用する。
    - **保存**:
        - 保存対象になった場合は、`GameDataRepository.setSavedFlightRecordIndex(data)` で永続化する。
        - 保存対象外で、航行結果画面でお気に入り登録もされなかった場合、そのリプレイデータは航行結果画面を抜けた時点で破棄する。
    - **エラー処理**: `pendingRecordDraft` が存在しない場合は、発射時 snapshot の取得漏れとして例外を投げる。

- **`createReplayContext(recordId: string): ReplayContext`**
    - 指定された航行記録から、リプレイ再生に必要な初期状態を復元する。
    - **内部挙動**:
        1. `FlightRecordIndex.records` から `recordId` に一致する `FlightRecord` を取得する。
        2. `FlightRecord.snapshots.sector` を `Sector.fromSnapshot()` へ渡し、発射時点の `Sector` を復元する。
        3. `FlightRecord.snapshots.rocket` を `Rocket.fromSnapshot()` へ渡し、発射時点の `Rocket` を復元する。
        4. UI 表示用メタ情報と復元済みインスタンスを `ReplayContext` として返す。
    - **エラー処理**: 対象記録が存在しない、または snapshot を復元できない場合は、データ整合性エラーとして例外を投げる。

- **`setFavorite(recordId: string, favorite: boolean): void`**
    - 指定された航行記録のお気に入り状態を更新する。
    - お気に入り上限は 5 件とし、上限到達時の置き換え判断は UI 側の確認ダイアログを経由する。

- **`savePendingRecordAsFavorite(): FlightRecord`**
    - 航行結果画面で、未保存の航行記録候補をお気に入りとして保存する。
    - 自動保存対象外だった航行でも、航行結果画面を抜ける前であればこのメソッドにより永続化できる。
    - 保存後は `pendingRecord` を破棄し、永続化済みの `records` 側へ移す。

- **`discardPendingRecord(): void`**
    - 航行結果画面を抜ける時点で、未保存の航行記録候補を破棄する。
    - 自動保存済み、または `savePendingRecordAsFavorite()` 済みの場合は何もしない。

## 4. 保存ルール

- リプレイ保存枠は最大 20 件とする。
- お気に入りは最大 5 件とし、20 件の保存枠の内数として扱う。
- 保存数が 20 件未満の場合、新しい航行記録はスコアに関係なく自動保存する。
- 保存数が 20 件に達している場合のみ、非お気に入り記録の最下位と新しい航行記録のスコアを比較して自動保存可否を判定する。
- 同スコアの場合は新しい記録を優先する。
- 保存枠を超える場合は、非お気に入り記録のうちスコア最下位の記録を削除する。同スコアの場合は記録日時が古い記録を削除する。
- 新しい航行記録が自動保存対象外であり、航行結果画面でお気に入り登録もされなかった場合、そのリプレイデータは航行結果画面を抜けた時点で破棄する。

## 5. 一時記録ライフサイクル

- `pendingRecordDraft`
    - 発射確定時に `captureLaunchSnapshot()` が作成する。
    - 発射時点の `RocketSnapshot` と `SectorSnapshot` のみを保持する。
    - 航行終了時に `recordFlightResult()` が `FlightRecord` 候補へ変換する。
- `pendingRecord`
    - 航行終了時に、自動保存対象外だった `FlightRecord` 候補を保持する。
    - 航行結果画面でお気に入り登録された場合は `savePendingRecordAsFavorite()` により永続化される。
    - 航行結果画面を抜ける時点で未保存なら `discardPendingRecord()` により破棄される。
- `records`
    - 永続化済みの `FlightRecord` 配列。
    - `GameDataRepository.setSavedFlightRecordIndex(data)` の対象となる。

## 6. データ構造定義 (Data Structures)

### FlightRecordIndex (永続化対象: キー `flight_record_index`)
```javascript
{
  records: FlightRecord[]
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
  resultType: 'cleared' | 'returned' | 'crashed' | 'lost',
  destinationType: string | null,
  favorite: boolean,
  snapshots: FlightReplaySnapshots
}
```

### FlightReplaySnapshots
発射時点の航行初期状態。
```javascript
{
  rocket: RocketSnapshot,
  sector: SectorSnapshot
}
```

- `rocket`: 発射時点の `Rocket` を復元するための snapshot。発射構成、発射角度、位置、初速を含む。
- `sector`: 発射時点の `Sector` を復元するための snapshot。天体、出口、セクター状態を含む。
- `FlightRecorder` は `RocketSnapshot` / `SectorSnapshot` の内部フィールドを解釈しない。

### FlightResultContext
航行終了時に `recordFlightResult()` へ渡すメタ情報。発射時 snapshot は含めない。
```javascript
{
  resultType: 'cleared' | 'returned' | 'crashed' | 'lost',
  score: number,
  totalScore: number,
  reachedSector: number,
  destinationType: string | null
}
```

### ReplayContext
リプレイ再生開始時に `FlightRecorder` が返す復元済みコンテキスト。
```javascript
{
  record: FlightRecord,
  rocket: Rocket,
  sector: Sector
}
```
