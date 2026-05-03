# Specification: PhysicsEngine Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 物理シミュレーター。
- **責務**:
    - ティック単位の積分計算。
    - 全天体からの重力合算。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`step(rocket: Rocket, sector: Sector): void`**
    - 1ティック分の物理更新を実行する。
    - **内部挙動**:
        1. セクター内の全天体（`sector.bodies`）からロケットにかかる重力を合算する。
        2. 算出された加速度に基づき、ロケットの新しい位置と速度を計算する。
        3. `rocket.updateState(newPos, newVel)` を呼び出し、ロケットの状態を更新させる。
