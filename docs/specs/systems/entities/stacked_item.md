# Specification: StackedItem Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Session
- **役割**: 個数を持つアイテムのコンテナ。
- **責務**:
    - 同一 ID のアイテムの個数管理。
    - アイテムの追加・削除・分割ロジックの提供。

## 2. インターフェース (Interface)
