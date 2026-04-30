# Specification: Rocket Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Flight Lifecycle
- **役割**: 航行中の単一の物理実体。
- **責務**:
    - RocketItem（静的データ）への参照の保持。
    - 航行中における現在の物理状態（位置、速度、回転）の保持。
    - 予測軌道データ（Predicted Path）の保持。
    - 航行中の航跡（Actual Trail）および一時的な回収アイテム（Cargo）の保持。

## 2. インターフェース (Interface)
