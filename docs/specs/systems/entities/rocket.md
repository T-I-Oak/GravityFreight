# Specification: Rocket Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Flight Lifecycle
- **役割**: 航行中の単一の物理実体。
- **責務**:
    - RocketItem（静的データ）への参照の保持。
    - 航行中における現在の物理状態（位置、速度、回転）の保持。
    - **初速の算出**: 保持するパーツ構成（`rocketItem`, `launcher`, `booster`）と射出角度（`angle`）に基づき、初速ベクトルを自己算出する。
    - **自己更新と集計**: 物理エンジンからの通知に基づき、自身の状態更新、航跡（`actualTrail`）の蓄積、および航行ティック数（スコア）のインクリメントを行う。
    - **成果の保持 (Result Carrier)**: 獲得スコア、回収した貨物（Cargo）、および保持状態の全アイテム（コイン等）を蓄積し、リザルト精算用データとして提供する。

## 2. インターフェース (Interface)

### プロパティ (Properties)

- **`uid: string`**: インスタンス固有のユニーク ID。
- `rocketItem: RocketItem`: 組み上げ済みロケットへの参照。
- `launcher: Item`: 使用するランチャーへの参照。
- `booster: Item | null`: 使用するブースターへの参照（装備なしの場合は `null`）。
- `angle: number`: 射出角度（ラジアン）。
- `position: Vector2`: 現在のワールド座標。
- `velocity: Vector2`: 現在の速度ベクトル。
- `actualTrail: Vector2[]`: 航行履歴（座標の配列）。
- `ticks: number`: 航行開始からの経過ティック累計（基本スコア）。
- `heldCargo: Item[]`: 保持状態（Held State）の全アイテム（貨物・コイン・パーツ等）のリスト。
- `isGhost: boolean`: 軌道予測用のシミュレーション個体であるかを示すフラグ（初期値 false）。
    - **ライフサイクル**: `TrajectoryPredictor` が実体をクローンした直後、`setGhost()` を介して `true` に設定される。
- `isSafeToReturn: boolean`: 母星から一度安全距離外へ脱出し、母星への帰還衝突を判定してよい状態であるかを示すフラグ（初期値 false）。
    - **ライフサイクル**: 発射直後は false。`PhysicsEngine` が母星中心から `home.radius + gameBalance.SAFE_DISTANCE_FROM_HOME` より外側へ出たことを検知した時点で true にする。
- `gravityEffectTicksRemaining: number`: Booster などによる時限重力倍率効果の残り tick 数。
- `lastEvasionBody: CelestialBody | null`: `cushion` による天体衝突回避直後、再吸着を防ぐため一時的に除外する天体への参照。保存対象ではない。

### メソッド (Methods)

- `setGhost(): void`
    - 自身をゴースト（シミュレーション用個体）としてマークする。一度 `true` になると戻すことはできない。

- **`clone(): Rocket`**
    - 現在の状態のコピーを生成して返す。内部的には `createSnapshot()` と `Rocket.fromSnapshot()` を組み合わせて実現する。

- **`createSnapshot(): object`**
    - 現在の状態をシリアライズ可能なオブジェクトとして抽出する。
    - **保存対象**:
        - `uid`
        - `rocketItem`: `RocketItem.createSnapshot()` の結果
        - `launcher`: `Item.createSnapshot()` の結果
        - `booster`: `Item.createSnapshot()` の結果、または `null`
        - `angle`
        - `position`
        - `velocity`
        - `actualTrail`
        - `ticks`
        - `heldCargo`: 各 `Item.createSnapshot()` の結果
        - `isGhost`
        - `isSafeToReturn`
        - `gravityEffectTicksRemaining`
    - **保存しない値**:
        - `getInitialVelocity()` で再計算できる初速計算過程。
        - `getCollectionRange()` / `getPrecision()` のような派生値。
    - **注意**: リプレイ用の発射時 snapshot では、通常 `ticks` は 0、`actualTrail` と `heldCargo` は空または発射直後の初期状態となる。軌道予測用の `clone()` では、その時点の状態を保持する。

- **`static fromSnapshot(snapshot: object, gameDataRepository: GameDataRepository): Rocket`**
    - スナップショットデータから新しい `Rocket` インスタンスを生成（復元）する。
    - **内部挙動**:
        1. `snapshot.rocketItem` を `RocketItem.fromSnapshot()` で復元する。
        2. `snapshot.launcher` を `Item.fromSnapshot()` で復元する。
        3. `snapshot.booster` が `null` でなければ `Item.fromSnapshot()` で復元する。
        4. 復元した発射構成から `Rocket` を生成し、`uid`, `angle`, `position`, `velocity`, `ticks`, `actualTrail`, `heldCargo`, `isGhost`, `isSafeToReturn` を復元する。
        5. `heldCargo` は各 item snapshot を `Item.fromSnapshot()` へ渡して復元する。
        6. `gravityEffectTicksRemaining` が snapshot に含まれる場合は復元し、含まれない場合は発射構成から初期値を算出する。
        7. 復元できない snapshot はデータ整合性エラーとして例外を投げる。

- `updateState(pos: Vector2, vel: Vector2): number`
    - 自身の `position`, `velocity` を更新する。
    - 同時に `actualTrail` へ現在の座標を追加し、`ticks` をインクリメントする。
    - 実航行の `actualTrail` は `gameBalance.TRAIL_MAX_LENGTH` を上限とし、古い点から削除する。軌道予測用の `isGhost` ロケットは、予測線の長さを保持するためこの上限を適用しない。
    - **戻り値**: インクリメント後の `ticks` を返す。
- `recordTrailPoint(point: Vector2 = position): void`
    - 物理位置や `ticks` を変更せず、描画用の航跡点だけを追加する。
    - 航行終了演出ではロケット位置を固定したまま現在位置を追加し続け、古い航跡と保持アイテムがロケットへ収束して消えるように見せる。
- `setRocketItem(item: Item): void`, `setLauncher(item: Item): void`, `setBooster(item: Item | null): void`
    - 装備構成を動的に変更する。ビルドフェーズでのリアルタイム予測線更新に使用される。
- `setAngle(angle: number): void`
    - 射出角度を更新する。照準フェーズでのリアルタイム予測線更新に使用される。
- `getInitialVelocity(powerBonus: number = 0): Vector2`
    - 現在セットされている `launcher`, `booster`, `angle` に基づいて初速ベクトルを算出して返す。
    - **内部計算**: `(rocketItem.getPower() + launcher.power + (booster?.power ?? 0)) * rocketItem.getPowerMultiplier() * launcher.powerMultiplier * (booster?.powerMultiplier ?? 1.0) * (1.0 + powerBonus) * sqrt(M_ref / rocketItem.getMass())` を基準速とし、`angle` 方向のベクトルを生成。
        - `M_ref` は `GameDataRepository.getGameBalance().DEFAULT_SHIP_MASS` を使用する。取得できない場合は `10` を既定値とする。
        - β v1 と同様に、重いロケットほど初速が下がる。
        - 現時点の item catalog に定義されている booster は `powerMultiplier` による補正を持つ。今後 `power` を持つ booster が追加された場合も、この式に従って加算値と倍率を集計する。
    - **呼び出し**: 航行開始直前に `GameController` が実行し自身の `velocity` にセットするほか、`PhysicsEngine` が予測線の初速として参照する。
- `getCollectionRange(): number`
    - 現在の回収可能範囲（半径）を計算して返す。
- `getArcMultiplier(): number`
    - 現在の構成（RocketItem, Launcher, Booster）から、出口判定に適用する開口幅倍率を算出して返す。
- `getGravityMultiplier(): number`
    - 現在の構成（RocketItem, Launcher, Booster）から、重力加速度に適用する倍率を算出して返す。
    - RocketItem と Launcher の `gravityMultiplier` は常時倍率として乗算する。
    - Booster が `gravityMultiplier` を持つ場合、`duration` が未定義なら常時倍率として扱い、`duration` が有限値なら `gravityEffectTicksRemaining > 0` の間だけ乗算する。
- `advanceGravityEffectTick(): void`
    - 時限重力効果の残り tick 数を 1 減らす。
    - `PhysicsEngine` が 1 tick の加速度計算後に呼び出す。
- `addHeldItem(item: Item): void`
    - 取得したアイテムを `heldCargo` リストに追加する。
- `useAvoidanceModule(type: 'body' | 'boundary', target: object | null): AvoidanceResult | null`
    - 衝突または境界到達時に、適切な手段で回避を試みる。
    - **内部挙動**:
        1. **回避可否の判定**:
            - **通常時**: 該当する通常モジュールを検索。`Charges > 0` の個体があれば **Charges を 1 減算** し、回避実行ステップへ進む。
            - **予測時（isGhost）**: 通常モジュールは無視し、該当するゴースト系モジュールが搭載されていれば回避実行ステップへ進む。Charges は消費しない。
        2. **回避実行（共通処理）**:
            - 判定をパスした場合、自身の `velocity` 等を回避後の物理状態に直接書き換え、適切な `AvoidanceResult` を生成して返す。
        3. **失敗**: 上記の条件を満たさない場合は `null` を返す。
    - **body 衝突時の優先順位**:
        1. `mod_star_breaker` / `mod_gst_breaker`: 対象天体を破壊し、`method: 'star_breaker'`, `destroyedTarget: target` を返す。天体上の未回収アイテムは破壊に伴い失われる。
        2. `mod_cushion` / `mod_gst_cushion`: 対象天体の中心からロケット位置へ向かう法線で速度を反射し、`method: 'cushion'`, `destroyedTarget: null` を返す。
            - 成功時は `lastEvasionBody` に対象天体を保持する。`PhysicsEngine` はロケットが十分離れるまで、この天体を重力計算と衝突判定から一時除外する。
    - **boundary 到達時**:
        - `mod_emergency` / `mod_gst_emergency`: 原点からロケット位置へ向かう境界法線で速度を反射し、`method: 'emergency'`, `destroyedTarget: null` を返す。
    - **速度制限**:
        - `star_breaker` / `cushion` 発動後の速度制限は、異常速度が問題になった場合に別途仕様化する。現時点では速度の上限補正は行わない。
    - **戻り値**: 回避成功時は `AvoidanceResult` を返し、不可なら `null` を返す。
- `getFlightResult(): FlightResultData`
    - 精算に必要なロケット由来の生データ（ticks, heldCargo, rocketItem）を抽出して返す。
    - セクター番号や配送ボーナス抽選は `Rocket` の責務ではないため含めない。
- `getPrecision(): number`
    - 現在の構成（RocketItem, Launcher, Booster）から、シミュレーションすべき最大ティック数（予測線の長さ）を算出して返す。
    - **計算の根拠**: 各パーツの `precision` および `precisionMultiplier` を集計して算出する。

## 3. データ構造定義 (Data Structures)

### `AvoidanceResult`
回避モジュール使用時の結果データ。
- **`method: string`**: 使用した回避手段（'star_breaker', 'cushion', 'thruster' 等）。
- **`destroyedTarget: object | null`**: 破壊された天体への参照。破壊されない場合は `null`。

### `FlightResultData`
航行終了時にロケットから抽出される生データ。
- **`ticks: number`**: 最終的な累計ティック数。
- **`heldCargo: Item[]`**: 保持状態のまま終了した全アイテムのリスト。
- **`rocketItem: RocketItem`**: 発射したロケット本体。保険金と crashed 時の構成パーツ生存判定に使用する。

### `RocketSnapshot`
```javascript
{
  uid: string,
  rocketItem: RocketItemSnapshot,
  launcher: ItemSnapshot,
  booster: ItemSnapshot | null,
  angle: number,
  position: { x: number, y: number },
  velocity: { x: number, y: number },
  actualTrail: { x: number, y: number }[],
  ticks: number,
  heldCargo: ItemSnapshot[],
  isGhost: boolean,
  gravityEffectTicksRemaining: number
}
```

- `rocketItem`, `launcher`, `booster` は発射時点の個体 snapshot として保存する。
- `position` と `velocity` は航行開始時の物理状態を再現するために保存する。
- `actualTrail`, `ticks`, `heldCargo`, `isGhost` は、その時点の `Rocket` 所有状態を復元するために保存する。
- リプレイ保存時は発射確定直後に `FlightRecorder.captureLaunchSnapshot()` から呼び出されるため、発射後の航跡や回収物は通常含まれない。
