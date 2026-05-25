# Specification: AchievementTracker Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: 実績管理。
- **責務**:
    - 実績（称号・トロフィー）の解禁判定。
    - 実績の達成状態と進捗率の保持。
    - ランキングおよびリプレイ記録の保存は担当しない。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `GameDataRepository` から保存された実績データを取得し、自身の内部状態を初期化する。
    - **内部実装詳細**:
        1. `MigrationMap`（GameDataRepository 仕様参照）を定義する。
           - `init()` はデフォルトの `AchievementData` を返す。
        2. `GameDataRepository.getSavedAchievementData(migrationMap)` を呼び出す。

### 実績更新 (Achievement Progress)

- **`recordGameResult(gameResult: GameResultSummary): void`**
    - 契約終了時のゲームリザルトを、実績達成状態へ反映する。
    - **呼び出しタイミング**: 契約終了が確定し、ゲームリザルトを表示する時点。
    - **内部挙動**:
        1. `gameResult` を実績定義に照合する。
        2. 達成条件を満たした実績の状態を更新する。
        3. `GameDataRepository.setSavedAchievementData(data)` で永続化する。

## 3. データ構造定義 (Data Structures)

### AchievementData (永続化対象: キー `achievement_data`)
```javascript
{
  // 構造は将来の実績仕様策定時に確定する
}
```
