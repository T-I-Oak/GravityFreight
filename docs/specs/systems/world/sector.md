# Specification: Sector Class

## 1. 概要 (Overview)

`Sector` クラスは、ゲームの最小プレイ単位である「セクター（ステージ）」の環境情報を保持し、その内部の要素（天体、目的地、境界）を管理するコンテナである。

- **生存期間**: Stage Lifecycle (セクター入場からクリアまで)
- **依存関係**: `CelestialBody`, `ExitArc`, `DataManager`

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `id` | `number` | セクター番号 (1-based)。しきい値の計算に使用。 |
| `threshold` | `number` | アイテム出現しきい値。`14 + id` で算出される。 |
| `boundaryRadius` | `number` | セクターの有効境界半径。デフォルト 900px。 |
| `celestialBodies` | `CelestialBody[]` | セクター内に配置された天体（重力源）のリスト。 |
| `exitArcs` | `ExitArc[]` | セクター境界に配置された目的地（出口）のリスト。 |
| `starCountBonus` | `number` | 闇市場の特典による、恒久的な天体追加数ボーナス。 |
| `state` | `object` | セクター内での動的状態（施設利用回数など）。 |
| `state.repairUsageCount` | `number` | 整備工場の利用回数。コスト計算に使用。 |

### 2.2 メソッド (Methods)

#### `constructor(sectorId, starCountBonus = 0)`
- **引数**:
    - `sectorId`: セクター番号。
    - `starCountBonus`: 以前のセクターで獲得した天体数ボーナスの累計。
- **処理**: 基本プロパティの初期化。

#### `initialize(dataManager)`
- **引数**: `DataManager` インスタンス。
- **処理**:
    - `dataManager` から配置ルールを取得。
    - 天体 (`CelestialBody`) をランダムに生成・配置（数はボーナスを考慮）。
    - 目的地 (`ExitArc`) を 3 つ（交易所、整備工場、闇市場）生成・配置。
    - 各天体にアイテムを抽選して配置 (`threshold` を使用)。

#### `getGravityAt(position)`
- **引数**: `position: {x, y}`
- **戻り値**: `vector: {x, y}`
- **処理**: 全天体からの重力影響を合算して返す。

#### `checkCollision(position, radius)`
- **引数**: `position, radius`
- **戻り値**: `CelestialBody | null`
- **処理**: ロケットがいずれかの天体に衝突しているか判定する。

#### `checkExit(position)`
- **引数**: `position`
- **戻り値**: `ExitArc | null`
- **処理**: ロケットがセクター境界の出口判定エリア内にあるか判定する。

#### `getSnapshot()`
- **戻り値**: `object` (Plain data)
- **処理**: UI描画やセーブに必要な、現在のセクター状態の静的なスナップショットを返す。

## 3. ロジック詳細

### 3.1 しきい値計算 (Threshold Logic)
- `this.threshold = 14 + this.id`
- この値は、天体生成時のアイテム抽選において、高レアリティアイテムの出現率を制御するために使用される。

### 3.2 天体生成 (Body Generation)
- 配置範囲: 半径 200px 〜 700px のドーナツ状エリア。
- 重なり防止: 新しい天体を配置する際、既存の天体と一定以上の距離を保つよう再試行を行う。

### 3.3 施設利用コスト (Facility Cost)
- 整備工場の「解体と強化」コストは `state.repairUsageCount` を用いて以下の通り計算する。
- `cost = 50 + (state.repairUsageCount * 50)`
