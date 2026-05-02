# Gravity Freight V2: Development Backlog

> [!IMPORTANT]
> 詳細な設計項目・進捗チェックは `docs/specs/scenarios/core_scenarios.md` を正とする。

- [x] **フェーズ 1.1: 起動・タイトル（シナリオ 1 完了）**
- [x] **フェーズ 1.2: セクター開始・ワープ演出（シナリオ 2 完了）**
- [ ] **フェーズ 1.3: ビルド画面・航行準備（シナリオ 3：シナリオ詳細化・コアエンティティ設計中）**
- [ ] **フェーズ 1.4: 航行・リザルト・施設（シナリオ 4〜5 の詳細設計中。4.1 完了）**
- [ ] **データスキーマ・マスタモデルの確定**
    - [x] `items.json` に基づく `Item` クラスの属性網羅。

## フェーズ 2: コアシステム実装 (22 Classes - TDD)
詳細設計で定義されたインターフェースに基づき、ロジックを TDD で実装する。

### 2.1 World & Entities
- [ ] **Sector** (環境コンテナ)
- [ ] **CelestialBody** (天体・重力源)
- [ ] **ExitArc** (目的地)
- [ ] **Rocket** (物理実体)
- [ ] **RocketItem** (構成データ)
- [ ] **Item** (アイテム基底)
- [ ] **StackedItem** (アイテム集約：未着手)
- [ ] **ItemContainer** (汎用コンテナ：未着手)

### 2.2 Logic & Engines
- [ ] **PhysicsEngine** (物理シミュレーター)
- [ ] **TrajectoryPredictor** (軌道予測)
- [ ] **EconomySystem** (価格・報酬計算)
- [ ] **MissionController** (進行管理)
- [ ] **StorySystem** (既読・フラグ管理)
- [ ] **AchievementTracker** (統計・実績)
- [ ] **FlightRecorder** (記録・再現)

### 2.3 Infrastructure & Orchestration
- [ ] **GameOrchestrator** (全体状態管理)
- [ ] **SessionState** (動的ステータス)
- [ ] **DataManager** (データプロバイダー)
- [ ] **UIController** (画面遷移・HUD制御)
- [ ] **WorldRenderer** (描画エンジン)
- [ ] **CameraController** (視界管理)
- [ ] **BackgroundManager** (遠景演出)

## フェーズ 3: 画面実装 (UI & Scene Logic)
実装されたコアシステムを組み込み、各シーンのビジュアルとインタラクションを構築する。

- [ ] **SCR-TITLE** (タイトル画面)
- [ ] **SCR-TUTORIAL** (説明書画面 / How to Play)
- [ ] **SCR-BUILD** (ビルド画面)
- [ ] **SCR-SECTOR-START** (セクター開始画面)
- [ ] **SCR-NAV** (航行画面)
- [ ] **SCR-FLIGHT-RESULT** (航行結果表示画面)
- [ ] **SCR-FACILITY** (施設画面)
- [ ] **SCR-GAME-RESULT** (ゲームリザルト画面)
- [ ] **SCR-GAME-OVER** (ゲームオーバー画面)

## フェーズ 4: 統合 & 検証 (Integration & Verification)
- [ ] **全体ステートマシンの結合**: 各画面とオーケストレーターの統合。
- [ ] **V1 ロジックの完全移植**: 既存の JSON データと計算ロジックの動作検証。
- [ ] **エンドツーエンドテスト**: タイトルからリザルト、保存/読込までの完走確認。

## 次回のセッションへの宿題 (Homework for next chat)

### 1. シナリオ 4（航行画面）のロジック詳細化
- [ ] **4.2「アイテム取得と特殊効果」**: 判定主体（Orchestrator か PhysicsEngine か）の決定と仕様化。
- [ ] **4.2.2「特殊モジュールの発動判定」**: `Star Breaker` などの回避アクションの発動シーケンスの定義。

### 2. シナリオ 4.3（終了判定）の詳細化
- [ ] **4.3.1〜4.3.4**: 成功・帰還・遭難・大破の具体的な物理条件と、それに伴うペナルティ計算（アイテム消失率等）の確定。

### 3. 仕様書への反映
- [ ] 上記決定事項を `docs/specs/` 配下の各システム仕様書（`physics_engine.md`, `rocket.md` 等）に反映する。
