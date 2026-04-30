# Specification: StorySystem Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 物語（Story）の選択・永続進捗管理。
- **責務**:
    - ストーリーIDごとの永続的な既読状態（isRead）の管理。
    - 条件に応じたストーリーIDの選出。
    - 既読フラグの更新と永続化（LocalStorage等）。

## 2. インターフェース (Interface)
