# Specification: BackgroundManager Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 背景描画管理。
- **責務**:
    - 宇宙空間（Starfield）の生成と描画。
    - カメラ状態（CameraController）に応じた背景の同期（回転・視差効果）。
    - セクター遷移時のワープ演出（星の高速移動・光跡描画）の制御。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`stars: Star[]`**: 
    - 背景を構成する星々のデータ配列。
    - 各 `Star` は `x, y, z`（ワールド相対座標）、`size`（大きさ）、`brightness`（輝度）を持つ。
- **`warpSpeed: number`**: 
    - 現在のワープ演出の速度係数。通常時は 1.0。

### メソッド (Methods)

- **`initialize(): void`**
    - 初期の星々をランダムに生成・配置する。
    - 視認性を高めるため、遠近感の異なる複数のレイヤー（Z軸の深さ）を持たせる。

- **`render(): void`**
    - `CameraController` の状態を参照し、背景を描画する。
    - **投影・同期ロジック**:
        1. **仮想ピボットの算出**: `ScreenCenter - (CameraController.position * 0.2)` を背景の回転中心とする。これにより、パンに対して 20% の視差（遅れてついてくる効果）が発生する。
        2. **星の相対座標の回転**: 各星のデータ `(x, y)` を `CameraController.rotation` に基づいて回転させる。
        3. **最終位置の決定**: 上記の仮想ピボットを原点として、回転・スケール済みの星の座標を配置する。
    - **ワープ演出**:
        - `warpSpeed` が一定値を超えている場合、星を Z 軸の手前方向へ移動させる。
        - 前フレームの座標と現在座標を結ぶライン（Streak）を描画し、速度感を演出する。

- **`startWarpEffect(duration: number): void`**
    - 航行開始やワープ突入時に、背景の星々を最高速まで加速させて「超高速移動感」を演出する。
    - 速度の上昇に伴い、星の点が長い光跡（Streak）へと変化し、画面全体に躍動感を与える。

- **`stopWarpEffect(duration: number): void`**
    - ワープ出口に接近した際、最高速から通常速度（1.0）まで減速させ、新セクターへの「到着感」を演出する。
    - 光跡が徐々に短くなって元の点へと戻り、静かな星空へと遷移する。

- **`handleResize(width: number, height: number): void`**
    - 画面サイズ変更に合わせて、描画領域や星の配置密度を調整する。
