# Specification: RankTracker Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: ランキング管理。
- **責務**:
    - ゲーム1プレイ単位の結果をランキング用データとして保存する。
    - `Score` / `Sector` / `Collected` などのランキングカテゴリごとに上位記録を管理する。
    - 直近のゲーム1プレイ結果を管理する。
    - 実績達成状態、累計KPI用の記録値、および航行単位のリプレイ記録は担当しない。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `GameDataRepository` から保存されたランキングデータを取得し、自身の内部状態を初期化する。
    - **内部実装詳細**:
        1. `MigrationMap` を定義する。
           - `init()` はデフォルトの `RankData` を返す。
        2. `GameDataRepository.getSavedRankData(migrationMap)` を呼び出す。

### ランキング更新 (Ranking Update)
- **`recordGameResult(gameResult: GameResultSummary): void`**
    - 契約終了時のゲームリザルトを、ランキングデータへ反映する。
    - **呼び出しタイミング**: 契約終了が確定し、ゲームリザルトを表示する時点。
    - **内部挙動**:
        1. `gameResult` からゲーム1プレイ結果を生成する。
        2. `Score` / `Sector` / `Collected` の各ランキングへ反映する。
        3. 直近のゲーム1プレイ結果へ反映する。
        4. `GameDataRepository.setSavedRankData(data)` で永続化する。

## 3. データ構造定義 (Data Structures)

### GamePlayResult
1プレイ単位の結果記録。
```javascript
{
  id: string,
  createdAt: string,
  score: number,
  completedSectors: number,
  reachedSector: number,
  collectedItemCount: number
}
```

### RankData (永続化対象: キー `rank_data`)
```javascript
{
  records: GamePlayResult[]
}
```

- `records` はランキング表示と直近プレイ結果表示に必要な `GamePlayResult` のみを保持する。
- `Score` / `Sector` / `Collected` の各Top20と、直近20件の和集合を保存対象とする。
- 同一 `GamePlayResult.id` が複数カテゴリの保存対象になる場合は1件に統合する。
- `Sector` ランキングは HUD 表示と揃えるため `reachedSector` を基準にする。
- `Score` は `score` 降順、`Sector` は `reachedSector` 降順、`Collected` は `collectedItemCount` 降順で並べる。同値の場合は `createdAt` が新しい記録を上位にする。
- `records` の保存順は実装内部の都合で決めてよい。表示時はカテゴリごとのソート条件で並べ替える。
- migration の `init()` は `{ records: [] }` を返す。
- 累計契約回数、累計踏破セクター数、累計回収アイテム数などの通算記録は `GameRecordTracker` の `game_record_data` が保持する。
