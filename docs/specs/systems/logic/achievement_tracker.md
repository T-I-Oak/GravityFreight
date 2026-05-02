# Specification: AchievementTracker Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: 統計・実績管理。
- **責務**:
    - プレイを跨いだ累計統計の保持。
    - 実績解除判定。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `DataManager` から累計統計・実績データを取得し、内部状態を初期化する。
    - 内部で `migrationMap` を定義し、`DataManager.getSavedAchievementData(migrationMap)` を呼び出す。

### 統計・実績管理 (Statistics & Achievement)
- **`trackProgress(key: string, value: number): void`**
    - 特定の統計項目（累計ティック数、総獲得コイン等）を更新し、実績の解除判定を行う。
    - 変更があった場合、`DataManager.setSavedAchievementData()` を通じて永続化する。

- **`isUnlocked(achievementId: string): boolean`**
    - 指定された実績が解除済みかどうかを返す。

## 3. データ構造定義 (Data Structures)

### AchievementData (永続化対象)
```javascript
{
  version: string,       // 最後に保存された際のアプリバージョン
  totalTicks: number,    // 累計航行ティック数
  unlockedIds: [],       // 解除済み実績IDのリスト
  stats: {               // 各種累計統計（key-value）
    "total_coins": number,
    "total_flights": number,
    ...
  }
}
```
