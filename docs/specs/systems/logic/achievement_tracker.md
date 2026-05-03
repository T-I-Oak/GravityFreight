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
    - 内部で `migrationMap` を定義し、`DataManager.getSavedAchievementData(migrationMap)` を呼び出す。

## 3. データ構造定義 (Data Structures)

### AchievementData (永続化対象)
- **ステータス**: 未定（各ドメインの仕様策定時に定義する）。
- **初期値**: `{}`（空のオブジェクト）。
- **備考**: 初期化（ロード）ができることのみを現時点で保証する。
