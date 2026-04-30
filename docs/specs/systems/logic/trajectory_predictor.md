# Specification: TrajectoryPredictor Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 軌道予測機。
- **責務**:
    - 未来の航跡計算。
    - 計算結果（座標配列）を Rocket 等へ提供する。

## 2. インターフェース (Interface)
