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

### 1. ドキュメントの整合性再チェック (最優先)
- [ ] **DataManager.md の最終確認**: ユーザーによる手動修正後の章番号重複や記述の整合性を再確認する。
- [ ] **各システムクラスの同期**: `DataManager` の最新定義（`initialCoins` への変更等）が、他の仕様書やシナリオと矛盾していないか全チェックする。

### 2. 「タイミング確定済み・詳細未検討」の領域の仕様化
- [ ] **Chapter 0.4**: `WorldRenderer` のシステム起動（Canvas 配置等）のメソッド化。
- [ ] **Chapter 1.1**: `GameController` のインスタンス化と初期化メソッドの定義。
- [ ] **Chapter 2.2.2**: `CelestialBody`, `ExitArc` の生成時の属性（位置、質量、アイテム等）セットルールの確定。
- [ ] **Chapter 3.1.3.2**: `Rocket` の生成時・航行開始前の物理状態（位置・速度・記録）のリセットルールの確定。

### 3. シナリオ 4（航行画面）のロジック詳細化
- [ ] **4.2「アイテム取得と特殊効果」**: 判定主体（Orchestrator か PhysicsEngine か）の決定と仕様化。
- [ ] **4.3「終了判定」**: 成功・帰還・遭難・大破の具体的な物理条件と、それに伴うペナルティ計算の確定。

### 今回のセッションでの確定事項
- **物語システム (Scenario 4.1.2)**: メールアイコンの挙動（T/R/B色分け、未読明滅）、モーダル表示時の既読化、UIフィードバックフローを確定。
- **カメラ永続化 (Scenario 3.1.1.3)**: 視点操作完了時の `DataManager.setSavedCameraState()` 呼び出しと保存項目を確定。
- **データ構造の刷新**: `AppMetadata`, `InitialSetupData`, `UserSettings`, `CameraState` の最新構造を `DataManager.md` に反映（ユーザー修正）。
