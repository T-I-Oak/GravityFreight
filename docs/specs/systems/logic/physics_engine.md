# Specification: PhysicsEngine Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 物理シミュレーター。
- **責務**:
    - ティック単位の積分計算。
    - 全天体からの重力合算。
    - ロケット重量、セクター重力倍率、発射構成の重力倍率を含む最終加速度の算出。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **bconstructor(gameDataRepository: GameDataRepository)b**
    - シミュレーション時間、境界半径、重力スケーリング係数などのマスタ設定を参照するため、bGameDataRepositoryb を受け取る。

- **bstep(rocket: Rocket, sector: Sector): objectb**
    - 1ティック分の物理更新と衝突・出口・境界判定を実行する。
    - **内部挙動**:
        1. セクター内の全天体（bsector.bodiesb）からロケットにかかる重力場を合算する。
            - 母星重力は発射直後から通常通り計算に含める。
            - brocket.isSafeToReturn === falseb の間、母星は衝突判定から一時除外する。
            - ロケットが母星中心から bhome.radius + gameBalance.SAFE_DISTANCE_FROM_HOMEb より外側へ出た時点で brocket.isSafeToReturnb を btrueb にし、以後は母星の衝突判定を通常通り有効化する。
            - brocket.lastEvasionBodyb が存在し、ロケットがその天体の bradius + gameBalance.SAFE_DISTANCE_FROM_HOMEb 内にいる場合、その天体は重力計算から一時除外する。十分に離れた場合は brocket.lastEvasionBodyb を解除する。
        2. 合算した重力場から、ロケットに適用する最終加速度を算出する。
        3. 算出された加速度に基づき、ロケットの新しい位置（bnewPosb）と速度（bnewVelb）を仮計算する。
        4. **衝突・到達判定**: 更新前の位置（boldPosb）と bnewPosb を用い、以下の優先順位で判定する。
            - **天体衝突**: bbody.checkCollision(newPos, oldPos, bodyCollisionRadius)b が真。
                - `bodyCollisionRadius` は `rocket.radius` が正の有限値ならその値、未定義の場合は `2` world px を船体半径として扱い、`gameBalance.COLLISION_MARGIN` を加算した値とする。
                - brocket.isSafeToReturn === falseb の間、母星との衝突判定は一時除外する。
                - brocket.lastEvasionBodyb が安全距離内にある場合、その天体との衝突判定は一時除外する。
                - **回避試行**: 衝突時、brocket.useAvoidanceModule('body', body)b を呼び出す。
                - **継続処理**: 戻り値（bavoidanceb）が bnullb でない場合、衝突判定をキャンセルし航行を継続。
                - **天体破壊**: bavoidance.destroyedTargetb がある場合、**引数で渡された bsector.bodiesb** から対象を除外する。
                    - ※予測時（brocket.isGhost === trueb）は、クローンされた bSectorb が渡されるため、オリジナルへの影響はない。
            - **出口到達**: barc.checkEntrance(newPos, rocket.getArcMultiplier())b が真。
                - 判定時は brocket.getArcMultiplier()b を bwidthMultiplierb として渡し、発射構成による出口幅補正を反映する。
                - bcollision.targetb には到達した bExitArcb を設定する。
                - 到達後の報酬計算、貨物配送、施設遷移は btarget.getFacilityType()b で施設タイプを参照する。
            - **境界到達**: bnewPosb が bboundaryRadiusb を越えた場合。
                - **回避試行**: brocket.useAvoidanceModule('boundary', null)b を呼び出す。成功時は衝突判定をキャンセルする。
        5. **アイテム回収判定**:
            - セクター内の全天体に対し、bbody.checkPickup(newPos, rocket.getCollectionRange())b を実行する。
            - アイテムを受け取った場合、brocket.addHeldItem(item)b を呼び出し保持リストに加える。
        6. ロケットの状態を更新し、演算結果を返す。
    - **重力加速度の算出**:
        1. 各天体について、ロケット位置との距離 brb を確認する。
        2. br^2 < 100b となる天体は特異点回避として重力計算から除外する。
        3. 除外対象でない天体について bbody.getGravityFieldVector(rocket.position)b を取得する。
        4. 全天体の重力場ベクトルを合算する。
        5. 合算したベクトルに以下の倍率を適用し、最終加速度とする。
            - 重力定数 bG = 4000b。
            - ロケット重量補正 bM_ref / M_rocketb。bM_ref = 10b、bM_rocketb はロケット構成パーツの合計質量。
            - セクター重力倍率 b1.0 + (sector.sectorNumber - 1) * 0.02b。
            - 発射構成の重力倍率 brocket.getGravityMultiplier()b。RocketItem / Launcher / Booster 由来の重力軽減・時限重力効果を含む。
        6. 最終的な加速度は以下の式と等価である。
            - bsum(body.mass / r^2 * direction * bodyPolarity) * G * (M_ref / M_rocket) * sectorScale * rocketGravityMultiplierb
            - bbodyPolarityb は bisRepulsion === trueb の場合に b-1.0b、それ以外の場合に b1.0b とする。
        7. 1 tick 分の加速度を算出した後、brocket.advanceGravityEffectTick()b を呼び、Booster などの時限重力効果を 1 tick 進める。
    - **責務境界**:
        - bCelestialBodyb は、自身の質量・方向・極性を反映した重力場ベクトルのみを提供する。
        - bRocketb は、発射構成から現在 tick に適用される重力倍率を提供する。
        - bPhysicsEngineb は、ロケット重量、セクター番号、重力倍率、設計定数、全天体合算、積分更新を扱う。
    - **戻り値**: b{ ticks: number, collision: object | null, avoidance: AvoidanceResult | null }b
        - bcollisionb 内容: b{ type: 'body'|'arc'|'boundary', target: object|null, pos: Vector }b
        - bavoidanceb: 今回のステップで発生した回避イベントの情報（演出用）。
