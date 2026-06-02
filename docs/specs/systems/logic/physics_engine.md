# Specification: PhysicsEngine Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 物理シミュレーター。
- **責務**:
    - ティック単位の積分計算。
    - 全天体からの重力合算。
    - ロケット重量とセクター重力倍率を含む最終加速度の算出。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`constructor(gameDataRepository: GameDataRepository)`**
    - シミュレーション時間、境界半径、重力スケーリング係数などのマスタ設定を参照するため、`GameDataRepository` を受け取る。

- **`step(rocket: Rocket, sector: Sector): object`**
    - 1ティック分の物理更新と衝突・出口・境界判定を実行する。
    - **内部挙動**:
        1. セクター内の全天体（`sector.bodies`）からロケットにかかる重力場を合算する。
        2. 合算した重力場から、ロケットに適用する最終加速度を算出する。
        3. 算出された加速度に基づき、ロケットの新しい位置（`newPos`）と速度（`newVel`）を仮計算する。
        4. **衝突・到達判定**: 更新前の位置（`oldPos`）と `newPos` を用い、以下の優先順位で判定する。
            - **天体衝突**: `body.checkCollision(newPos, oldPos, rocket.radius)` が真。
                - **回避試行**: 衝突時、`rocket.useAvoidanceModule('body', body)` を呼び出す。
                - **継続処理**: 戻り値（`avoidance`）が `null` でない場合、衝突判定をキャンセルし航行を継続。
                - **天体破壊**: `avoidance.destroyedTarget` がある場合、**引数で渡された `sector.bodies`** から対象を除外する。
                    - ※予測時（`rocket.isGhost === true`）は、クローンされた `Sector` が渡されるため、オリジナルへの影響はない。
            - **出口到達**: `arc.checkEntrance(newPos, rocket.getArcMultiplier())` が真。
                - 判定時は `rocket.getArcMultiplier()` を `widthMultiplier` として渡し、発射構成による出口幅補正を反映する。
                - `collision.target` には到達した `ExitArc` を設定する。
                - 到達後の報酬計算、貨物配送、施設遷移は `target.getFacilityType()` で施設タイプを参照する。
            - **境界到達**: `newPos` が `boundaryRadius` を越えた場合。
                - **回避試行**: `rocket.useAvoidanceModule('boundary', null)` を呼び出す。成功時は衝突判定をキャンセルする。
        5. **アイテム回収判定**:
            - セクター内の全天体に対し、`body.checkPickup(newPos, rocket.getCollectionRange())` を実行する。
            - アイテムを受け取った場合、`rocket.addHeldItem(item)` を呼び出し保持リストに加える。
        6. ロケットの状態を更新し、演算結果を返す。
    - **重力加速度の算出**:
        1. 各天体について、ロケット位置との距離 `r` を確認する。
        2. `r^2 < 100` となる天体は特異点回避として重力計算から除外する。
        3. 除外対象でない天体について `body.getGravityFieldVector(rocket.position)` を取得する。
        4. 全天体の重力場ベクトルを合算する。
        5. 合算したベクトルに以下の倍率を適用し、最終加速度とする。
            - 重力定数 `G = 4000`。
            - ロケット重量補正 `M_ref / M_rocket`。`M_ref = 10`、`M_rocket` はロケット構成パーツの合計質量。
            - セクター重力倍率 `1.0 + (sector.sectorNumber - 1) * 0.02`。
        6. 最終的な加速度は以下の式と等価である。
            - `sum(body.mass / r^2 * direction * bodyPolarity) * G * (M_ref / M_rocket) * sectorScale`
            - `bodyPolarity` は `isRepulsion === true` の場合に `-1.0`、それ以外の場合に `1.0` とする。
    - **責務境界**:
        - `CelestialBody` は、自身の質量・方向・極性を反映した重力場ベクトルのみを提供する。
        - `PhysicsEngine` は、ロケット重量、セクター番号、設計定数、全天体合算、積分更新を扱う。
    - **戻り値**: `{ ticks: number, collision: object | null, avoidance: AvoidanceResult | null }`
        - `collision` 内容: `{ type: 'body'|'arc'|'boundary', target: object|null, pos: Vector }`
        - `avoidance`: 今回のステップで発生した回避イベントの情報（演出用）。
