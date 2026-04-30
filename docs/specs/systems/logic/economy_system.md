# Specification: EconomySystem Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 経済・取引ロジック。
- **責務**:
    - アイテムが自己算出する基準価格を合算し、経済ボーナスを加味した最終的な報酬額・取引価格の決定。
    - 取引（Buy/Sell/Repair）の成否判定。

## 2. インターフェース (Interface)
