# Specification: TrajectoryPredictor Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 軌道予測機。
- **責務**:
    - 未来の航跡計算。
    - 計算結果（座標配列）を Rocket 等へ提供する。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`predictPath(rocket: Rocket, sector: Sector): Rocket`**
    - 現在のロケット構成と角度に基づいた未来の航跡をシミュレーションする。
    - **内部挙動**:
        1. 引数で渡された `rocket` のクローンを作成する。
        2. `PhysicsEngine.step(clone, sector)` を指定された上限ティック分（例: 2400）ループ実行する。
        3. ループ完了後、航行履歴（`actualTrail`）が蓄積された `clone` を返す。
