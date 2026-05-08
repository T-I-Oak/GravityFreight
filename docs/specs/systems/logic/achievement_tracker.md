# Specification: AchievementTracker Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle
- **役割**: 実績・統計管理。
- **責務**:
    - 累計統計（移動距離、スコア等）の保持。
    - 実績（称号・トロフィー）の解禁判定。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `DataManager` から保存された実績・統計データを取得し、自身の内部状態を初期化する。
    - **内部実装詳細**:
        1. `MigrationMap`（DataManager 仕様参照）を定義する。
           - `init()` はデフォルトの `AchievementData` を返す。
        2. `DataManager.getSavedAchievementData(migrationMap)` を呼び出す。

## 3. データ構造定義 (Data Structures)

### AchievementData (永続化対象)
```javascript
{
  // 構造は将来の実績・統計仕様策定時に確定する
}
```
