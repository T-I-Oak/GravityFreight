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

## 3. データ構造定義 (Data Structures)

### AchievementData (永続化対象)
- **ステータス**: 未定（各ドメインの仕様策定時に定義する）。
- **初期値**: `{}`（空のオブジェクト）。
- **備考**: 初期化（ロード）ができることのみを現時点で保証する。
