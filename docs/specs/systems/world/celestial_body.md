# Specification: CelestialBody Class

## 1. 概要 (Overview)

`CelestialBody` クラスは、セクター内に配置される物理的な天体オブジェクト（星）を表現します。
自らの質量に基づく重力場の計算（引力・斥力）、ロケットとの衝突判定（CCD）、およびステージ内で回収可能なアイテム（Cargo）の管理を担当します。

- **生存期間**: Stage Lifecycle (セクター入場からクリアまで)
- **依存関係**: `StackedItem`, `Rocket` (引数として)

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `uid` | `string` | 天体のユニークID。物理追跡やUI描画キーとして使用。 |
| `position` | `{x: number, y: number}` | 天体の中心座標。(`Sector` クラスによって決定される) |
| `radius` | `number` | 天体の描画半径。質量に基づいて生成される。 |
| `mass` | `number` | 天体の質量 ($M_{star}$)。 |
| `gravityMultiplier` | `number` | 重力倍率 ($G_{mult}$)。1.0 が標準、負の値で斥力星となる。 |
| `cargo` | `StackedItem[]` | この天体が保持している回収可能なアイテム群。 |

### 2.2 メソッド (Methods)

#### `constructor(config)`
- **引数**:
    - `config`: 初期化オブジェクト。以下のプロパティを受け取る。
        - `position`: 必須。`{x: number, y: number}`
        - `gravityMultiplier`: 任意。デフォルト `1.0`
        - `items`: 任意。初期保持アイテム（`StackedItem`または`Item`）の配列。デフォルト `[]`
        - `uid`: 任意。スナップショット復元用。未指定時は `crypto.randomUUID()` で一意な文字列を生成。
        - `mass`: 任意。復元用。未指定時は V1ロジックに則り `5000 + Math.random() * 15000` で決定。
        - `radius`: 任意。復元用。未指定時は V1ロジックに則り `Math.sqrt(this.mass) / 5 + 2` で決定。
- **処理**: 上記のルールに従い、各プロパティを初期化する。

#### `getGravityVectorAt(rocket, globalScale)`
- **引数**:
    - `rocket`: `Rocket` オブジェクト（`position`, `mass` を持つ）。
    - `globalScale`: セクター進行に伴う重力のグローバルスケーリング値。
- **戻り値**: `{x: number, y: number}` (重力加速度ベクトル)
- **処理**:
    - ロケットの座標と天体の座標から距離 $r$ を算出。
    - 特異点回避のため、距離 $r$ が 10px 未満 ($r^2 < 100$) の場合は `{x: 0, y: 0}` を返す。
    - 以下の基本式に基づき、ロケットへ働く加速度ベクトルを計算する。
      $a = (G \cdot mass / r^2) \cdot (M_{ref} / rocket.mass) \cdot gravityMultiplier \cdot globalScale$
    - $G$ は重力定数 (4000)、$M_{ref}$ は基準質量 (10) とする。
    - `gravityMultiplier` が負の場合、ベクトルは自然と斥力（天体から遠ざかる方向）となる。

#### `checkCollision(rocket)`
- **引数**:
    - `rocket`: `Rocket` オブジェクト（`position`, `previousPosition`, `radius` を持つ）。
- **戻り値**: `boolean`
- **処理**:
    - CCD (Continuous Collision Detection: 連続衝突検知) を用いて判定する。
    - `rocket.previousPosition` から `rocket.position` を結ぶ線分と、この天体の衝突円（半径 = `this.radius` + 5px + `rocket.radius`）との最短距離が衝突半径未満であれば `true`（衝突）を返す。

#### `addCargo(stackedItem)`
- **引数**: `stackedItem`: `StackedItem` オブジェクト
- **処理**:
    - 天体にアイテムを追加する。
    - 既存の `cargo` 配列内に同じアイテムIDを持つ `StackedItem` が存在する場合はそのスタックに統合 (`push`) し、存在しなければ新規に配列へ追加する。

#### `hasCargo()`
- **戻り値**: `boolean`
- **処理**: 回収可能なアイテムを保持しているか（`this.cargo.length > 0`）を返す。

#### `takeCargo()`
- **戻り値**: `StackedItem[]`
- **処理**: 保持しているすべてのアイテムを取得し、内部の `cargo` 配列を空にする。

#### `getSnapshot()`
- **戻り値**: `object`
- **処理**: 自身の現在の状態をシリアライズ可能なプレーンオブジェクトとして返す。（`uid`, `position`, `radius`, `mass`, `gravityMultiplier`, 各 `cargo` のスナップショットなどを含む）

#### `static fromSnapshot(data)`
- **引数**: `data`: `getSnapshot` で生成されたオブジェクト
- **戻り値**: `CelestialBody` インスタンス
- **処理**: 渡されたデータを使用してインスタンスを復元（Hydration）する。復元時は `uid`, `mass`, `radius` などが再生成されず、保存された値が用いられる。
