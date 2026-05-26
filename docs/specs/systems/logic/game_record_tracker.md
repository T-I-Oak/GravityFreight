# Specification: GameRecordTracker Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: ゲーム全体の記録値管理。
- **責務**:
    - 航行終了時の結果と契約終了時の結果から、累計値・最大値などの抽象的な記録値を更新する。
    - 実績判定や Analytics のサイドKPIが参照する `game_record_data` を永続化する。
    - 実績の達成判定、ランキング表示用の上位記録、航行単位のリプレイ記録は担当しない。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `GameDataRepository` から保存された記録データを取得し、自身の内部状態を初期化する。
    - **内部実装詳細**:
        1. `MigrationMap` を定義する。
           - `init()` はデフォルトの `GameRecordData` を返す。
        2. `GameDataRepository.getSavedGameRecordData(migrationMap)` を呼び出す。

### 記録更新 (Record Update)
- **`recordFlightResult(result: FlightResultContext): GameRecordChange`**
    - 航行終了時の結果を、航行単位で確定する記録値へ反映する。
    - **呼び出しタイミング**: 航行結果が確定した時点。
    - **内部挙動**:
        1. 更新前の `GameRecordData` を `before` として保持する。
        2. `result` から更新対象の記録値を算出する。
        3. `values` の累計値・最大値を更新する。
        4. `GameDataRepository.setSavedGameRecordData(data)` で永続化する。
        5. `before` と更新後の `after` を `GameRecordChange` として返す。

- **`recordGameResult(gameResult: GameResultSummary): GameRecordChange`**
    - 契約終了時のゲームリザルトを、ゲーム全体の記録値へ反映する。
    - **呼び出しタイミング**: 契約終了が確定し、ゲームリザルトを表示する時点。
    - **内部挙動**:
        1. 更新前の `GameRecordData` を `before` として保持する。
        2. `gameResult` から更新対象の記録値を算出する。
        3. `values` の累計値・最大値を更新する。
        4. `GameDataRepository.setSavedGameRecordData(data)` で永続化する。
        5. `before` と更新後の `after` を `GameRecordChange` として返す。

- **`getRecordValue(recordKey: string): number`**
    - 実績判定や表示で参照する単一の記録値を返す。
    - 存在しない `recordKey` は 0 として扱う。

- **`getGameRecordData(): GameRecordData`**
    - Analytics のサイドKPIなど、複数の記録値をまとめて参照する画面向けに現在の記録データを返す。

## 3. データ構造定義 (Data Structures)

### GameRecordData (永続化対象: キー `game_record_data`)
```javascript
{
  values: {
    [recordKey: string]: number
  }
}
```

- `values` は記録値を抽象的な `recordKey` ごとに保持する。
- migration の `init()` は `{ values: {} }` を返す。
- 実績定義は `recordKey` を参照し、`AchievementTracker` はその記録値と実績定義を照合して達成状態を算出する。
- `RankTracker` が保持するランキング用レコードを剪定しても、累計KPIや実績判定が失われないようにする。
- 現時点で想定する `recordKey` は以下とする。
    - `lifetime_contracts`: 契約完了回数の累計。
    - `total_completed_sectors`: 踏破セクター数の累計。
    - `total_collected_item_count`: 回収アイテム数の累計。
    - `max_score`: 1契約内の最大スコア。
    - `max_reached_sector`: 1契約内の最大到達セクター。
    - `max_collected_item_count`: 1契約内の最大回収アイテム数。
- 最大値判定か最小値判定か、または累計値を参照するかは記録値そのものではなく、記録値を参照する実績定義・表示仕様側で扱う。
- 将来、連続達成数のように現在連続数と最大連続数の両方を保持しないと継続判定できない記録を追加する場合は、その時点で `GameRecordData` の構造を見直す。

### GameRecordChange
```javascript
{
  before: GameRecordData,
  after: GameRecordData
}
```

- `GameRecordChange` は記録更新処理の戻り値であり、永続化しない。
- `before` は今回の更新前に `GameRecordTracker` が保持していた永続化済み相当の状態、`after` は今回の更新後に永続化した状態とする。
- `AchievementTracker` はこの差分から、新規に到達した tier を判定する。
