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
            - `GameDataRepository.getMasterConfig()` から `homeStarRadius` および `homeStarMass` を取得してセットする。
        - **それ以外の場合**:
            - **`radius`**: マスタ設定の規定範囲（30〜60px）からランダムに決定する。
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

- **`checkCollision(currentPos: Vector2, prevPos: Vector2, targetRadius: number): boolean`**
    - CCD (Continuous Collision Detection) を用いた衝突判定を行う。
    - **判定**: 線分 `prevPos` 〜 `currentPos` と、天体中心 `this.position` との最短距離が `(this.radius + targetRadius)` 以下であるか。

- **`checkPickup(targetPos: Vector2, pickupRadius: number): ItemBase[]`**
    - ロケットの回収範囲内に天体が入っているかを判定し、未取得なら保持アイテムをすべて抽出して返す。
    - **判定 (world_config 3.1準拠)**: `(distance(this.position, targetPos) - this.radius) <= pickupRadius`。
    - **挙動**:
        1. 判定が真、かつ `this.items.length > 0` の場合に実行。
        2. 保持している `this.items` をローカル変数に退避させる。
        3. `this.items = []` を実行し、天体からアイテムを完全に除去する（所有権の移動）。
        4. 退避させておいたアイテムの配列を返す。
        5. 条件を満たさない場合は空配列を返す。

- **`addItems(items: ItemBase[]): void`**
    - 指定されたアイテムを `this.items` リストに追加する。主にクラッシュ時の遺失物回収ロジックで使用される。

- **`createSnapshot(): object`**
    - 現在の天体状態をシリアライズ可能な形式で抽出する。
    - **保存対象**:
        - `position`
        - `isRepulsion`
        - `isHome`
        - `radius`: `isHome === false` の場合のみ、ランダム決定済みの半径として保存する。
        - `items`: 各 `Item.createSnapshot()` の結果。
    - **保存しない値**:
        - `mass`: 通常天体は `radius * radius`、母星はマスタ値から再計算する。
        - 母星の `radius`: マスタ値から再解決する。
    - **注意**: `items` は発射時点で天体が保持している未回収アイテムを表す。航行中に回収されると `CelestialBody` から除去されるため、リプレイ用 snapshot は発射時点で取得する。

- **`static fromSnapshot(snapshot: object): CelestialBody`**
    - `CelestialBodySnapshot` から天体インスタンスを復元する。
    - **内部挙動**:
        1. `position`, `isRepulsion`, `isHome` を復元する。
        2. `isHome === true` の場合、`radius` と `mass` はマスタ値から解決する。
        3. `isHome === false` の場合、`snapshot.radius` を使用し、`mass = radius * radius` として再計算する。
        4. `items` は各 item snapshot を `Item.fromSnapshot()` へ渡して復元する。
        5. 復元できない snapshot はデータ整合性エラーとして例外を投げる。

## 3. データ構造定義 (Data Structures)

### CelestialBodySnapshot
```javascript
{
  position: { x: number, y: number },
  isRepulsion: boolean,
  isHome: boolean,
  radius?: number,
  items: ItemSnapshot[]
}
```

- `radius` は通常天体のみ保存する。母星では保存しない。
- `items` の各要素は保持している `Item` の snapshot とする。
