# Specification: CelestialBody Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: World Domain
- **生存期間**: Stage Lifecycle
- **役割**: 物理的な天体オブジェクト。
- **責務**:
    - 重力場の提供。
    - 衝突判定用ジオメトリの提供。
    - 保持アイテム（Cargo）の管理。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`position: Vector2`**: ワールド絶対座標 `{ x, y }`。
- **`radius: number`**: 天体の半径（ピクセル）。
- **`mass: number`**: 天体の質量。重力計算の係数として使用される。
- **`isRepulsion: boolean`**: 重力の極性。`true` の場合は斥力（反発）、`false` の場合は引力。
- **`isHome: boolean`**: 母星フラグ。`(0, 0)` に位置する唯一の引力源であれば `true`。
- **`items: ItemBase[]`**: この天体が保持しているアイテムのリスト。

### メソッド (Methods)

- **`constructor(params: object)`**
    - **引数**: `position`, `isRepulsion`, `isHome`, `items` を含むオブジェクト。
    - **挙動**: 
        - **`isHome` が `true` の場合**: 
            - `DataManager` から `homeStarRadius` および `homeStarMass` を取得してセットする。
        - **それ以外の場合**:
            - **`radius`**: `DataManager` の規定範囲（30〜60px）からランダムに決定する。
            - **`mass`**: `this.radius * this.radius` として算出する。
        - その他 `position`, `isRepulsion`, `items` 等を初期化する。

- **`getGravityVector(targetPos: Vector2): Vector2` (未承認)**
    - 指定された座標（ロケットの位置）に対して、この天体が及ぼす重力ベクトルを計算する。
    - **計算式**: 
        1. 距離 `r = distance(this.position, targetPos)`。
        2. 方向ベクトル `d = normalize(this.position - targetPos)`。（天体中心を指すベクトル）
        3. 大きさ `f = this.mass / (r * r)`。
        4. `isRepulsion` が `true` なら `d` を反転させる。
        5. `d * f` を返す。

- **`checkCollision(targetPos: Vector2, targetRadius: number): boolean` (未承認)**
    - 指定された円（ロケット）との衝突判定を行う。
    - **判定**: `distance(this.position, targetPos) <= (this.radius + targetRadius)`。

- **`checkPickup(targetPos: Vector2, pickupRadius: number): ItemBase[]` (未承認)**
    - ロケットの回収範囲内に天体が入っているかを判定し、未取得なら保持アイテムをすべて抽出して返す。
    - **判定 (world_config 3.1準拠)**: `(distance(this.position, targetPos) - this.radius) <= pickupRadius`。
    - **挙動**: 
        1. 判定が真、かつ `this.items.length > 0` の場合に実行。
        2. 保持している `this.items` をローカル変数に退避させる。
        3. `this.items = []` を実行し、天体からアイテムを完全に除去する（所有権の移動）。
        4. 退避させておいたアイテムの配列を返す。
        5. 条件を満たさない場合は空配列を返す。

