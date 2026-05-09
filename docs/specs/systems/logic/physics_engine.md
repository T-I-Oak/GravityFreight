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

- **`step(rocket: Rocket, sector: Sector): object`**
    - 1ティック分の物理更新と衝突・出口・境界判定を実行する。
    - **内部挙動**:
        1. セクター内の全天体（`sector.bodies`）からロケットにかかる重力を合算する。
        2. 算出された加速度に基づき、ロケットの新しい位置（`newPos`）と速度（`newVel`）を仮計算する。
        3. **衝突・到達判定**: 更新前の位置（`oldPos`）と `newPos` を用い、以下の優先順位で判定する。
            - **天体衝突**: `body.checkCollision(newPos, oldPos, rocket.radius)` が真。
                - **回避試行**: 衝突時、`rocket.useAvoidanceModule('body', body)` を呼び出す。
                - **継続処理**: 戻り値（`avoidance`）が `null` でない場合、衝突判定をキャンセルし航行を継続。
                - **天体破壊**: `avoidance.destroyedTarget` がある場合、**引数で渡された `sector.bodies`** から対象を除外する。
                    - ※予測時（`rocket.isGhost === true`）は、クローンされた `Sector` が渡されるため、オリジナルへの影響はない。
            - **出口到達**: `arc.checkEntrance(newPos)` が真。
            - **境界到達**: `newPos` が `boundaryRadius` を越えた場合。
                - **回避試行**: `rocket.useAvoidanceModule('boundary', null)` を呼び出す。成功時は衝突判定をキャンセルする。
        4. **アイテム回収判定**:
            - セクター内の全天体に対し、`body.checkPickup(newPos, rocket.getCollectionRange())` を実行する。
            - アイテムを受け取った場合、`rocket.addHeldItem(item)` を呼び出し保持リストに加える。
        5. ロケットの状態を更新し、演算結果を返す。
    - **戻り値**: `{ ticks: number, collision: object | null, avoidance: AvoidanceResult | null }`
        - `collision` 内容: `{ type: 'body'|'arc'|'boundary', target: object|null, pos: Vector }`
        - `avoidance`: 今回のステップで発生した回避イベントの情報（演出用）。
