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
- `bonusScore: number`: 航行中に獲得した追加報酬スコア。
- `heldCoins: number`: 航行中に取得したコインの合計。
- `heldCargo: Item[]`: 保持状態の貨物リスト。
- `heldItems: Item[]`: 保持状態のパーツ・消耗品リスト。

### メソッド (Methods)

- `updateState(pos: Vector2, vel: Vector2): void`
    - 自身の `position`, `velocity` を更新する。
    - 同時に `actualTrail` へ現在の座標を追加し、`ticks` をインクリメントする。
- `getInitialVelocity(): Vector2`
    - `rocketItem`, `launcher`, `booster`, `angle` に基づいて初速ベクトルを算出して返す。
    - 航行開始直前に `GameOrchestrator` が呼び出し、結果を `velocity` にセットする。
- `getTicks(): number`
    - 現在の累計ティック数を返す。
- `addBonusScore(value: number): void`
    - ボーナススコアを加算する。
- `addHeldItem(item: Item): void`
    - アイテム（貨物・パーツ等）を保持リストに追加する。
- `getFlightResult(): FlightResultData`
    - 最終的なリザルト表示および精算に必要なデータ一式を返す。
