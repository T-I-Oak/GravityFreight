# Specification: Sector Class

## 1. 概要 (Overview)

`Sector` クラスは、ゲームの最小プレイ単位である「セクター（ステージ）」の環境情報を保持し、その内部の要素（天体、目的地、境界）を管理するコンテナである。

- **生存期間**: Stage Lifecycle (セクター入場からクリアまで)
- **依存関係**: `CelestialBody`, `ExitArc`, `DataManager`

## 2. クラス定義 (Class Definition)

### 2.1 プロパティ (Properties)

| プロパティ | 型 | 説明 |
| :--- | :--- | :--- |
| `number` | `number` | セクター番号 (1-based)。しきい値の計算に使用。 |
| `returnBonus` | `number` | このセクターにおける現在の帰還ボーナス倍率 (1.0〜)。 |
| `threshold` | `number` | アイテム出現しきい値。`14 + number` で算出される。 |
| `boundaryRadius` | `number` | セクターの有効境界半径。デフォルト 900px。 |
| `celestialBodies` | `CelestialBody[]` | セクター内に配置された天体（重力源）のリスト。 |
| `exitArcs` | `ExitArc[]` | セクター境界に配置された目的地（出口）のリスト。 |
| `additionalBodyCount` | `number` | 以前のセクターでの累積的な天体追加数。 |

### 2.2 メソッド (Methods)

#### `constructor(sectorNumber, additionalBodyCount = 0)`
- **引数**:
    - `sectorNumber`: セクター番号。
    - `additionalBodyCount`: 累積された天体追加数。
- **処理**: 基本プロパティの初期化。`returnBonus` は 1.0 で初期化される。

#### `initialize(dataManager)`
- **引数**: `DataManager` インスタンス。
- **処理**:
    - `dataManager` から配置ルールを取得し、天体 (`CelestialBody`) と目的地 (`ExitArc`) を生成・配置する。
    - 各天体のアイテム抽選に `this.threshold` を使用する。

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
- **戻り値**: `object` (Plain Data / JSON)
- **処理**: 自身の状態をシリアライズ可能なプレーンオブジェクトとして返す。
- **カプセル化**: 配下の `CelestialBody` 等に対してもそれぞれの `getSnapshot()` を呼び出し、再帰的にデータを収集する。

#### `static fromSnapshot(data)`
- **引数**: `data` (getSnapshot で生成されたオブジェクト)
- **戻り値**: `Sector` インスタンス
- **処理**: 渡されたデータに基づいてクラスを再構築（Hydration）する。
- **カプセル化**: 内部データの構造は本メソッドおよび `getSnapshot` 内に閉じ込める。配下要素の復元はそれぞれの `fromSnapshot` メソッドに委ねる。

## 3. ロジック詳細

### 3.1 しきい値計算 (Threshold Logic)
- `this.threshold = 14 + this.number`
- この値は、天体生成時のアイテム抽選において、高レアリティアイテムの出現率を制御するために使用される。

### 3.2 天体生成 (Body Generation)
- 配置範囲: 半径 200px 〜 700px のドーナツ状エリア。
- 重なり防止: 新しい天体を配置する際、既存の天体と一定以上の距離を保つよう再試行を行う。

### 3.3 リプレイと描画への適用
- UI (View) 側で `generateCardHTML` などのリッチな表示ロジックを使用する場合、描画の直前に `fromSnapshot` を用いて一時的なインスタンスを生成し、それを View に提供することを推奨する。これにより、ロジックの二重実装を避け、カプセル化を維持したまま一貫した表示が可能となる。
