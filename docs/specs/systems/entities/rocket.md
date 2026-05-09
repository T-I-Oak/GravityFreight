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

### メソッド (Methods)

- `setGhost(): void`
    - 自身をゴースト（シミュレーション用個体）としてマークする。一度 `true` になると戻すことはできない。

- **`clone(): Rocket`**
    - 現在の状態のコピーを生成して返す。内部的には `createSnapshot()` と `Rocket.fromSnapshot()` を組み合わせて実現する。

- **`createSnapshot(): object`** *(保留)*
    - 現在の状態をシリアライズ可能なオブジェクトとして抽出する。
- **`static fromSnapshot(snapshot: object): Rocket`** *(保留)*
    - スナップショットデータから新しい `Rocket` インスタンスを生成（復元）する。


- `updateState(pos: Vector2, vel: Vector2): number`
    - 自身の `position`, `velocity` を更新する。
    - 同時に `actualTrail` へ現在の座標を追加し、`ticks` をインクリメントする。
    - **戻り値**: インクリメント後の `ticks` を返す。
- `setRocketItem(item: Item): void`, `setLauncher(item: Item): void`, `setBooster(item: Item | null): void`
    - 装備構成を動的に変更する。ビルドフェーズでのリアルタイム予測線更新に使用される。
- `setAngle(angle: number): void`
    - 射出角度を更新する。照準フェーズでのリアルタイム予測線更新に使用される。
- `getInitialVelocity(powerBonus: number = 0): Vector2`
    - 現在セットされている `launcher`, `booster`, `angle` に基づいて初速ベクトルを算出して返す。
    - **内部計算**: `(launcher.power + (booster?.power ?? 0)) * (1.0 + powerBonus)` を基準速とし、`angle` 方向のベクトルを生成。
    - **呼び出し**: 航行開始直前に `GameController` が実行し自身の `velocity` にセットするほか、`PhysicsEngine` が予測線の初速として参照する。
- `getCollectionRange(): number`
    - 現在の回収可能範囲（半径）を計算して返す。
- `addHeldItem(item: Item): void`
    - 取得したアイテムを `heldCargo` リストに追加する。
- `useAvoidanceModule(type: 'body' | 'boundary', target: object | null): AvoidanceResult | null`
    - 衝突または境界到達時に、適切な手段で回避を試みる。
    - **内部挙動**:
        1. **回避可否の判定**:
            - **通常時**: 該当する回避モジュールを検索。`Charges > 0` の個体があれば **Charges を 1 減算** し、回避実行ステップへ進む。
            - **予測時（isGhost）**: 装備品から今回の回避種別に対応する `ghostType`（'avoidance' | 'destruction' 等）を検索。存在すれば（実モジュールの有無や Charges に関わらず）回避実行ステップへ進む。
        2. **回避実行（共通処理）**:
            - 判定をパスした場合、自身の `velocity` 等を回避後の物理状態に直接書き換え、適切な `AvoidanceResult` を生成して返す。
        3. **失敗**: 上記の条件を満たさない場合は `null` を返す。
    - **戻り値**: 回避成功時は `AvoidanceResult` を返し、不可なら `null` を返す。
- `getFlightResult(): FlightResultData`
    - 精算に必要な生データ（ticks, heldCargo）を抽出して返す。
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
