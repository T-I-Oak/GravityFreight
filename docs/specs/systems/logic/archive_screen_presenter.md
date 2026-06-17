# Specification: ArchiveScreenPresenter Class

## 1. 役割と責務

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: Analytic Archive 表示用 view data 生成。
- **責務**:
    - `GameRecordTracker` から通算 KPI を取得する。
    - `RankTracker` から Personal Best Ranking と直近結果を取得する。
    - `FlightRecorder` から Replays 一覧を取得する。
    - `AchievementTracker` と実績定義から Achievements カード表示用データを取得する。
    - 各 tracker の実データを UI 表示に必要な文字列、順位、進捗率へ変換する。

## 2. 責務境界

- DOM 生成、タブ切替、閉じる操作は担当しない。
- リプレイ再生開始、お気に入り変更、実績判定、ランキング永続化は担当しない。
- 表示に必要なデータは、各 tracker の公開メソッドから取得する。

## 3. インターフェース

- **`constructor(dependencies: object)`**
    - `gameRecordTracker`, `rankTracker`, `achievementTracker`, `flightRecorder`, `gameDataRepository` を受け取る。

- **`createViewData(): ArchiveViewData`**
    - Archive 画面全体の表示データを生成する。
    - `kpis.totalCompletedSectors` は `game_record_data.values.total_completed_sectors` を使用する。
    - `kpis.lifetimeContracts` は `game_record_data.values.lifetime_contracts` を使用する。
    - `kpis.totalCollectedItems` は `game_record_data.values.total_collected_item_count` を使用する。
    - `kpis.achievementRate` は `AchievementTracker.getAchievementCompletionRate()` を百分率の整数へ変換する。
    - `rankings.score`, `rankings.sector`, `rankings.collected` は `RankTracker.getRanking()` から取得する。
    - `recentResults` は `RankTracker.getRecentResults()` から取得する。
    - Analytics の推移グラフは `recentResults` を古い記録から新しい記録の順に並べ替えて表示する。横軸は20件ぶんの固定スロットを使用し、縦軸は系列ごとに `0` から最大値までで正規化する。
    - `replays` は `FlightRecorder.getRecords()` から取得し、表示順は `FlightRecorder` の返却順を使用する。
    - `ArchiveReplayRow.id` は `FlightReplayRecord.id` を使用し、UI の行選択からリプレイ開始対象を特定するために保持する。
    - `achievements` は `AchievementTracker.getAchievementProgress()` と `GameDataRepository.getAchievementDefinitions()` を突き合わせて生成する。

## 4. 表示データ

```javascript
{
  kpis: {
    totalCompletedSectors: number,
    lifetimeContracts: number,
    totalCollectedItems: number,
    achievementRate: number
  },
  recentResults: ArchiveRankRow[],
  rankings: {
    score: ArchiveRankRow[],
    sector: ArchiveRankRow[],
    collected: ArchiveRankRow[]
  },
  replays: ArchiveReplayRow[],
  achievements: ArchiveAchievementRow[]
}
```

- 日付表示は `YYYY.MM.DD HH:mm` 形式とする。
- 未達成の実績カードタイトルは `NOT ACHIEVED` とし、次 tier の goal を進捗表示に使用する。

### ArchiveReplayRow

```javascript
{
  id: string,
  rank: string,
  sector: number,
  score: string,
  dateTime: string,
  favorite: boolean
}
```

- `id` は表示文字列ではなく、`FlightRecorder.createReplayContext(recordId)` に渡す識別子として使用する。
