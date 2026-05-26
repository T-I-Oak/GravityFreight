# Specification: AchievementTracker Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: 実績管理。
- **責務**:
    - 実績（称号・トロフィー）の解禁判定。
    - `GameRecordTracker` が管理する記録値と実績定義を照合し、実績の達成状態と進捗率を算出する。
    - 記録値の更新前後を比較し、新規に到達した tier を通知イベントとして返す。
    - 実績の判定に使用する累計値・最大値などの記録データ、ランキング、リプレイ記録の保存は担当しない。
    - tier 到達トーストなどの表示は担当しない。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `GameDataRepository` から実績定義を取得し、実績判定に必要な内部参照を初期化する。
    - 実績進捗の永続値は `GameRecordTracker` が所有する `game_record_data` を参照する。

### 実績更新 (Achievement Progress)

- **`evaluateAchievements(change: GameRecordChange): AchievementTierReached[]`**
    - 更新前後の記録値を比較し、今回の更新で新規に到達した tier を返す。
    - **呼び出しタイミング**: 航行終了時、および契約終了が確定しゲームリザルトを表示する時点。
    - **内部挙動**:
        1. `change.before` と `change.after` から、実績定義が参照する記録キーの更新前後の値を取得する。
        2. 更新前後それぞれの到達 tier を算出する。
        3. 更新後 tier が更新前 tier を上回る場合、その差分を `AchievementTierReached` として返す。
        4. トースト表示などの UI 通知は、呼び出し元が戻り値を UI 層へ渡して行う。

- **`getAchievementProgress(): AchievementProgress[]`**
    - 記録画面表示用に、現在の実績進捗データを返す。
    - 戻り値は永続データそのものではなく、実績定義と `GameRecordData` から算出した表示用データとする。
    - `progressRate` は各実績カードで表示する、次の tier までの進捗率とする。

- **`getAchievementCompletionRate(): number`**
    - 全実績定義に対する達成済み実績の割合を 0.0〜1.0 の範囲で返す。
    - 段階制の実績では、1段階以上を達成していれば達成済みとして扱う。
    - 達成状態は `GameRecordData` の記録値と実績定義の tier `goal` から都度算出する。

## 3. データ構造定義 (Data Structures)

### AchievementProgress
```javascript
{
  achievementId: string,
  recordKey: string,
  value: number,
  achievedTier: number | null,
  nextTier: number | null,
  progressRate: number
}
```

- `AchievementProgress` は表示・判定結果であり、現時点では永続化しない。
- 実績定義そのもの、表示ラベル、tier の `goal` / `title`、参照する `recordKey`、最大値判定か最小値判定かの条件種別は `content.json` のマスタデータとして扱う。
- 達成済み tier は `GameRecordData` の記録値とマスタ定義の `tiers[].goal` を照合して算出する。
- 解除日時は保存しない。実績目標値や tier 定義を更新した場合でも、保存済みの記録値から現在の達成状態を再評価できるようにする。
- tier 到達トーストは、永続化済み相当の更新前データと今回更新後データの差分で判定する。通知済み状態は永続化しない。
- 将来、解除日時など、実績ごとに記録値から再計算できない状態を保存する必要が出た場合は、その時点で `achievement_data` の追加を検討する。

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
