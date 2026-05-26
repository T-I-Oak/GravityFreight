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
        1. **スナップショット作成**: `sector.clone()` および `rocket.clone()` を実行し、シミュレーション用の独立したインスタンスを取得する。
        2. `cloneRocket.setGhost()` を実行し、シミュレーション用個体としてマークする。
        3. `PhysicsEngine.step(cloneRocket, cloneSector)` を **`cloneRocket.getPrecision()`** で得られた上限回数分ループ実行する。
        4. 途中で衝突判定（`collision != null`）が発生した場合は、その時点でループを打ち切る。
        5. ループ完了後、航行履歴（`actualTrail`）が蓄積された `cloneRocket` を返す。
    - **注意**: `Rocket.clone()` / `Sector.clone()` は軌道予測用の独立シミュレーション状態を得るために使用する。snapshot 仕様を利用するが、全クラスに汎用 clone API を要求するものではない。
