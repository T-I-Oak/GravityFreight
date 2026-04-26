# Architecture Specification: Class Roles (クラス役割定義書)

## 1. 目的と役割 (Purpose and Roles)

本ドキュメントは、Gravity Freight V2 の最終実装において必要となるクラスの役割（Roles）、責務の境界、およびその生存期間（Lifecycle）を定義する。
設計原理（階層性、単純性、明晰性）に基づき、各クラスの責任を分離することで、拡張性が高くデバッグの容易なアーキテクチャを実現することを目的とする。

---

## 2. 生存期間の定義 (Lifecycle Definitions)

システム内でのオブジェクトのライフサイクルを以下の4段階に定義し、データの永続性とリセットの境界を明確にする。

| 区分 | 説明 | リセットタイミング |
| :--- | :--- | :--- |
| App Lifecycle | ゲームの起動から終了まで。マスタデータや設定など、プレイを跨いで共通の要素。 | アプリ終了時 |
| Game Lifecycle | 契約の開始（Begin Contract）から、終了（End Contract / Game Over）まで。1回のプレイセッションの状態。 | Titleへ戻る / Game Over時 |
| Stage Lifecycle | セクター（ステージ）への入場から、クリアして次のセクターへ移動するまで。失敗時の再試行ではリセットされない。 | セクタークリア（次へ移動）時 |
| Flight Lifecycle | 1回のロケット発射（Launch）から、その航行結果（Success, Crashed等）が確定するまで。 | リザルト確認 / Buildingへ戻る時 |

---

## 3. ワールドドメイン (World Domain)

宇宙空間を構成する、主に静的・準静的な物理要素。

- **Sector**
    - 生存期間: Stage Lifecycle
    - 役割: 航行セッションの環境定義とコンテナ。
    - 責務:
        - 天体配置、出口の種類、セクター境界の保持。
        - スナップショットの提供。
        - セクター内状態（整備工場の利用回数カウント等）の保持。
- **CelestialBody (GravitySource)**
    - 生存期間: Stage Lifecycle
    - 役割: 物理的な天体オブジェクト。
    - 責務: 重力場の提供、衝突判定用ジオメトリ、保持アイテムの管理。
- **ExitArc (Goal)**
    - 生存期間: Stage Lifecycle
    - 役割: 航行の目的地。
    - 責務: ゴール判定用の角度範囲（Angle Range）および施設タイプの保持。

---

## 4. エンティティドメイン (Entity Domain)

ゲーム内の主要なアクター、およびプレイヤーの資産データ。

- **Rocket**
    - 生存期間: Flight Lifecycle
    - 役割: プレイヤーが操作する物理実体としてのロケット。
    - 責務:
        - パーツ性能の集計、現在の物理状態（位置、速度、回転）の保持。
        - 予測軌道データ（Predicted Path）の保持。
        - 航行中の航跡（Actual Trail）および回収アイテム（Cargo）の保持。
- **Item**
    - 生存期間: Game Lifecycle（インスタンスとして）
    - 役割: ゲーム内の全アイテムの基底。
    - 責務: 個別の属性（ID、現在耐久値、強化状態）の保持。
- **Inventory**
    - 生存期間: Game Lifecycle
    - 役割: プレイヤーの資産管理。
    - 責務: 所持アイテム（Itemインスタンス）のリスト管理。
- **SessionState**
    - 生存期間: Game Lifecycle
    - 役割: 現在の契約（Contract）における動的ステータスの集約・保持。
    - 責務: 所持金（Coins）、累計スコア、現在のセクター番号、今回獲得したストーリーID（最大3つ）、統計データの保持。

---

## 5. ロジックドメイン (Logic Domain)

ゲームの物理・経済・進行などの「ルール」を実行するステートレスなサービス。

- **PhysicsEngine**
    - 生存期間: App Lifecycle (Service)
    - 役割: 物理シミュレーター。
    - 責務: ティック単位の積分計算、全天体からの重力合算。
- **TrajectoryPredictor**
    - 生存期間: App Lifecycle (Service)
    - 役割: 軌道予測機。
    - 責務: 未来の航跡計算。計算結果（座標配列）を Rocket 等へ提供する。
- **EconomySystem**
    - 生存期間: App Lifecycle (Service)
    - 役割: 経済・取引ロジック。
    - 責務: 査定価格の算出、報酬額の計算、取引（Buy/Sell/Repair）の成否判定ロジック。
- **MissionController**
    - 生存期間: Game Lifecycle
    - 役割: セクター進行管理。
    - 責務: SessionState のセクター番号更新、Sector の生成・破棄管理。
- **StorySystem**
    - 生存期間: App Lifecycle (Service)
    - 役割: 物語（Story）の選択・永続進捗管理。
    - 責務:
        - ストーリーIDごとの永続的な既読状態（isRead）の管理。
        - 条件に応じたストーリーIDの選出。
        - 既読フラグの更新と永続化（LocalStorage等）。
- **AchievementTracker**
    - 生存期間: App Lifecycle
    - 役割: 統計・実績管理。
    - 責務: プレイを跨いだ累計統計の保持、実績解除判定。
- **FlightRecorder**
    - 生存期間: App Lifecycle
    - 役割: 記録・リプレイ。
    - 責務: スナップショットの永続化保存、再現の実行。

---

## 6. システムドメイン (System Domain)

描画、入力、全体制御などのインフラストラクチャ。

- **GameOrchestrator**
    - 生存期間: App Lifecycle
    - 役割: メインコントローラー。
    - 責務: 全体ステートマシンの管理、各ライフサイクルの開始・終了（Begin/End Contract）のトリガー。
- **DataManager**
    - 生存期間: App Lifecycle
    - 役割: データプロバイダー。
    - 責務:
        - 外部データソース（マスタ）の保持。
        - 静的データ（アイテム、ストーリー、実績定義等）への統一されたアクセスインターフェースの提供。
- **UIController**
    - 生存期間: App Lifecycle
    - 役割: 表示管理。
    - 責務:
        - 画面遷移、ダイアログ表示の制御。
        - HUD（SessionStateの情報と、StorySystemの既読状態に基づく点滅）の制御。
- **BackgroundManager**
    - 生存期間: App Lifecycle
    - 役割: 遠景演出管理。
    - 責務: Starfield の生成、ワープ演出の制御。
- **WorldRenderer**
    - 生存期間: App Lifecycle
    - 役割: ワールド描画エンジン。
    - 責務: 各要素の描画順序の制御。
- **CameraController**
    - 生存期間: App Lifecycle
    - 役割: 視界管理。
    - 責務: ズーム、パン、座標変換。
