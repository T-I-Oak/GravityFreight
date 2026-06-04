# Specification: AchievementTracker Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: 実績管理。
- **責務**:
    - 実績（称号・トロフィー）の解禁判定。
    - `GameRecordTracker` が管理する記録値、または `StorySystem` が管理する既読状態と実績定義を照合し、実績の達成状態と進捗率を算出する。
    - 前回評価時の参照値と現在の参照値を比較し、新規に到達した tier を通知イベントとして返す。
    - 実績の判定に使用する累計値・最大値などの記録データ、ランキング、リプレイ記録の保存は担当しない。
    - ストーリー既読状態の保存は担当しない。
    - tier 到達トーストなどの表示は担当しない。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `GameDataRepository` から実績定義を取得し、実績判定に必要な内部参照を初期化する。
    - 実績進捗の永続値は、実績定義の参照ソースに応じて `GameRecordTracker` の `game_record_data` または `StorySystem` の `StoryProgressData` を参照する。
    - 初期化時点の各実績の到達 tier を内部の前回評価状態として保持する。

### 実績更新 (Achievement Progress)

- **`evaluateAchievements(target: AchievementEvaluationTarget): AchievementTierReached[]`**
    - 指定された参照ソースの現在値を再取得し、前回評価時との差分から今回新規に到達した tier を返す。
    - **呼び出しタイミング**: 4章の評価タイミング表に従い、参照ソースの値が変化する処理の直後。
    - **内部挙動**:
        1. `target.source` と実績定義の参照ソースが一致し、かつ `target.keys` に参照キーが含まれる実績を抽出する。
        2. 各実績について、参照ソースから現在値を取得する。
        3. 内部に保持している前回評価 tier と、現在値から算出した到達 tier を比較する。
        4. 現在 tier が前回評価 tier を上回る場合、その差分を `AchievementTierReached` として返す。
        5. 評価後、該当実績の前回評価 tier を現在 tier へ更新する。
        6. トースト表示などの UI 通知は、呼び出し元が戻り値を UI 層へ渡して行う。

- **`getAchievementProgress(): AchievementProgress[]`**
    - 記録画面表示用に、現在の実績進捗データを返す。
    - 戻り値は永続データそのものではなく、実績定義と参照ソース側の現在値から算出した表示用データとする。
    - `progressRate` は各実績カードで表示する、次の tier までの進捗率とする。

- **`getAchievementCompletionRate(): number`**
    - 全実績定義に対する達成済み実績の割合を 0.0〜1.0 の範囲で返す。
    - 段階制の実績では、1段階以上を達成していれば達成済みとして扱う。
    - 達成状態は実績定義の参照ソース側の現在値と tier `goal` から都度算出する。

## 3. データ構造定義 (Data Structures)

### AchievementProgress
```javascript
{
  achievementId: string,
  source: 'game_record' | 'story_read',
  key: string,
  value: number,
  achievedTier: number | null,
  nextTier: number | null,
  progressRate: number
}
```

- `AchievementProgress` は表示・判定結果であり、現時点では永続化しない。
- 実績定義そのもの、表示ラベル、tier の `goal` / `title`、参照ソース、参照キー、最大値判定か最小値判定かの条件種別は `content.json` のマスタデータとして扱う。
- 実績定義は以下の形を基本とする。
```javascript
{
  id: string,
  source: 'game_record' | 'story_read',
  key: string,
  condition: 'max',
  label: string,
  tiers: [
    { goal: number, title: string }
  ]
}
```
- `tiers` は高い目標値から低い目標値へ並べる。配列 index + 1 を tier 番号として扱うため、最上位 tier は `1` とする。
- 現在の実績定義はすべて `condition: 'max'` とし、最小値・連続数などの条件は該当実績を追加する時点で条件種別を拡張する。
- `source: 'game_record'` の実績は `GameRecordData` の記録値を参照する。
- `source: 'story_read'` の実績は `StoryProgressData.readMessageIds` の件数を参照する。ストーリー既読数実績はこのソースを使用する。
- 達成済み tier は参照ソース側の現在値とマスタ定義の `tiers[].goal` を照合して算出する。
- 解除日時は保存しない。実績目標値や tier 定義を更新した場合でも、保存済みの記録値から現在の達成状態を再評価できるようにする。
- tier 到達トーストは、永続化済み相当の更新前データと今回更新後データの差分で判定する。通知済み状態は永続化しない。
- 将来、解除日時など、実績ごとに記録値から再計算できない状態を保存する必要が出た場合は、その時点で `achievement_data` の追加を検討する。

### AchievementEvaluationTarget
```javascript
{
  source: 'game_record' | 'story_read',
  keys: string[]
}
```

- `AchievementEvaluationTarget` は、今回再評価する実績の参照元と参照キーを指定する。
- `game_record` は `GameRecordTracker` の `game_record_data` を参照する実績を再評価する。
- `story_read` は `StorySystem` の既読数を参照する実績を再評価する。
- `keys` には、今回の処理で更新された参照キーのみを指定する。契約終了時に航行終了で判定済みのキーを再指定しない。
- 前回評価 tier は `AchievementTracker` のメモリ上の状態であり、永続化しない。アプリ起動時は現在の参照値から初期化するため、既存達成分のトーストは再表示しない。

### AchievementTierReached
```javascript
{
  achievementId: string,
  tier: number,
  value: number
}
```

- `AchievementTierReached` は今回の記録更新で新規到達した tier を表す一時イベントであり、永続化しない。
- 1回の更新で複数 tier をまたいだ場合は、到達した tier ごとにイベントを返す。

## 4. 実績定義ごとの参照値と評価タイミング

現在の `content.json` に存在する実績は、以下のタイミングで再評価する。

| achievementId | 参照値 | 評価タイミング |
| :--- | :--- | :--- |
| `stat_runs` | 契約完了回数 | 契約終了時 |
| `stat_sectors` | `SessionState.reachedSector` の最大値 | セクター開始時 |
| `stat_total_sectors` | `SessionState.completedSectors` の累計 | 航行終了時 |
| `stat_launches` | 累積発射回数 | 航行終了時 |
| `stat_max_dist` | 1航行内の最長航行距離 | 航行終了時 |
| `stat_distance` | 累積航行距離 | 航行終了時 |
| `stat_max_deliveries` | 1契約内の最高配達数 | 配達成功時 |
| `stat_deliveries` | 累積配達数 | 配達成功時 |
| `stat_max_score` | 1契約内の最高スコア | 航行終了時 |
| `stat_total_score` | 累積獲得スコア | 航行終了時 |
| `stat_max_coins_earned` | 1契約内の最高獲得コイン | 航行終了時、施設取引時 |
| `stat_total_coins` | 累積獲得コイン | 航行終了時、施設取引時 |
| `stat_spend_coins` | 累積消費コイン | 施設取引時 |
| `stat_max_coins` | 最高所持コイン数 | コイン増減確定時 |
| `stat_stories_read` | 既読ストーリー総数 | ストーリー既読化時 |
| `stat_t_branch` | `T` 系列の既読ストーリー数 | ストーリー既読化時 |
| `stat_r_branch` | `R` 系列の既読ストーリー数 | ストーリー既読化時 |
| `stat_b_branch` | `B` 系列の既読ストーリー数 | ストーリー既読化時 |

- `stat_*_branch` は `StoryProgressData.readMessageIds` のうち、ストーリーIDの先頭文字が対象系列に一致する件数を参照する。
- `reachedSector` はクリアしたかどうかに関わらず到達済みの最大セクター、`completedSectors` はクリア済みセクター数を表す。両者は意味が異なるため、実績定義では別の参照値として扱う。
- `stat_sectors` はプレイヤーがそのセクターに入ったことを明確に認識できるよう、次セクター開始時に評価する。
- `completedSectors` は航行結果確定時に更新される値であり、専用の評価タイミングは設けない。航行終了時の `game_record` 評価で判定する。
- 発射回数は発射時点で増加が確定するが、初版では即時通知を必須としないため、航行終了時の `game_record` 評価で判定する。
- 航行中に値が増加する実績であっても、初版では航行中フレームごとのトースト判定は必須としない。航行終了時にまとめて評価する。
- 評価タイミング表にない実績を追加する場合は、実績定義の追加と同時に参照値と評価タイミングをこの表へ追加する。
