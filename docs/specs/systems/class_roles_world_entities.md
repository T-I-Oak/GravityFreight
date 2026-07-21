# Architecture Specification: World / Entity Domain Roles

本ドキュメントは class_roles.md から分割した、ワールドドメインとエンティティドメインの役割定義である。

## 4. ワールドドメイン (World Domain)

宇宙空間を構成する、主に静的・準静的な物理要素。

- **Sector**
    - 生存期間: Stage Lifecycle
    - 役割: 航行セッションの環境定義とコンテナ。
    - 責務:
        - セクター内に配置される `CelestialBody`（天体）および `ExitArc`（出口）のリストの保持。
        - セクター境界（Boundary Radius）および帰還ボーナスの保持。
        - セクター全体の完全なスナップショットの生成と提供。
- **CelestialBody (GravitySource)**
    - 生存期間: Stage Lifecycle
    - 役割: 物理的な天体オブジェクト。
    - 責務: 重力場の提供、衝突判定用ジオメトリ、保持アイテムの管理。
- **ExitArc (Goal)**
    - 生存期間: Stage Lifecycle
    - 役割: 航行の目的地。
    - 責務: 配置位置（ゴールの中心角度）とゴール判定用の角度範囲（Angle Range）、および施設タイプの保持。

---

## 5. エンティティドメイン (Entity Domain)

ゲーム内の主要なアクター、およびプレイヤーの資産データ。

- **RocketItem** (extends Item)
    - 生存期間: Exist Lifecycle
    - 役割: パーツ構成や基本性能（質量など）を保持するインベントリアイテム。
    - 責務: 内部パーツ構成に基づいた集計性能（mass, slots 等）の算出。
- **Rocket**
    - 生存期間: Flight Lifecycle
    - 役割: 照準・航行中の物理実体。
    - 責務:
        - **コンテキスト保持**: `RocketItem`, `Launcher`, `Booster` への参照、および射出角度（angle）の保持。
        - **物理パラメータの算出**: 自身のアイテム構成と角度に基づいた「初速ベクトル（Initial Velocity）」の自己算出。
        - **動的状態の管理**: 自身の物理状態（位置、速度、回転）の保持。
        - **自己更新と集計 (`updateState`)**: 物理エンジンから通知された新しい状態を適用し、同時に航跡データ（`actualTrail`）への追加と航行ティック数（スコア）のインクリメントを自律的に行う。
        - **成果の集計（Result Carrier）**: 航行中に獲得したスコア、所持コインの増分、回収した貨物（Cargo）、および保持状態の全アイテムを蓄積し、リザルト画面に提供する。
- **Item**
    - 生存期間: Exist Lifecycle
    - 役割: ゲーム内の全アイテムの基底。
    - 責務: 個別の属性（ID、現在耐久値、強化状態）の保持。
- **StackedItem**
    - 生存期間: Exist Lifecycle
    - 役割: 同一 ID かつ **「同一性能」** のアイテムを個数で管理する実体。
    - 責務: インベントリ内でのスタック管理、UI 表示（代表値の返却）の提供。
- **ModuleStack**
    - 生存期間: Exist Lifecycle
    - 役割: ロケット内部で、同一 ID のアイテムを **「機能プール」** として一括管理する実体。
    - 責務: 異なる性能のアイテムを統合した合計耐久度の管理、および消費戦略（LIFO/FIFO等）に基づく耐久度減算。
- **ItemContainer**
    - 生存期間: Exist Lifecycle
    - 役割: プレイヤーの所持品（StackedItem）を管理するインベントリの実体。
    - 責務: カテゴリ別抽出、スタック単位の検索、およびアイテムの入出庫（addItem/pop）の提供。
- **SessionState**
    - 生存期間: Game Lifecycle
    - 役割: 現在の契約（Contract）における動的ステータスの集約・保持。
    - 責務: 所持金（Coins）、累計スコア、現在のセクター番号、獲得ストーリーID、統計データの保持。およびプレイヤー全体所持品（ItemContainer）の管理。

---
