# Gravity Freight V2: Development Backlog

## V2リリースに向けたロードマップ

### 1. Foundation & World (舞台と基盤)
- [ ] Item (アイテム基底)
    - [x] 設計
    - [ ] 実装
- [ ] CelestialBody (天体・重力源)
    - [ ] 設計
    - [ ] 実装
- [ ] ExitArc (目的地)
    - [ ] 設計
    - [ ] 実装
- [ ] Sector (セクター環境)
    - [ ] 実装

### 2. Core Flight & Physics (飛行と物理)
- [ ] Rocket (物理実体・航跡保持)
    - [ ] 設計
    - [ ] 実装
- [ ] PhysicsEngine (物理シミュレーター)
    - [ ] 設計
    - [ ] 実装
- [ ] TrajectoryPredictor (軌道予測エンジン)
    - [ ] 設計
    - [ ] 実装

### 3. Player State & Economy (資産と経済)
- [ ] Inventory (プレイヤー所持品)
    - [ ] 設計
    - [ ] 実装
- [ ] SessionState (セッション統計・HUDデータ)
    - [ ] 設計
    - [ ] 実装
- [ ] EconomySystem (価格・報酬計算)
    - [ ] 設計
    - [ ] 実装

### 4. Progression & Content (進行と物語)
- [ ] MissionController (セクター進行管理)
    - [ ] 設計
    - [ ] 実装
- [ ] StorySystem (物語・既読管理)
    - [ ] 設計
    - [ ] 実装
- [ ] AchievementTracker (累計統計・実績)
    - [ ] 設計
    - [ ] 実装
- [ ] FlightRecorder (リプレイ・スナップショット)
    - [ ] 設計
    - [ ] 実装

### 5. View & Interaction (表示と描画)
- [ ] WorldRenderer (ワールド描画)
    - [ ] 設計
    - [ ] 実装
- [ ] CameraController (カメラ・座標変換)
    - [ ] 設計
    - [ ] 実装
- [ ] BackgroundManager (遠景演出)
    - [ ] 設計
    - [ ] 実装
- [ ] UIController (表示・画面遷移)
    - [ ] 設計
    - [ ] 実装

### 6. Orchestration (全体統括)
- [ ] GameOrchestrator (全体統括・ステートマシン)
    - [ ] 設計
    - [ ] 実装

## 今後のロードマップ (Roadmap)
- [ ] 各ドメインの統合テストと最終調整
- [ ] メインゲームループの結合とステートマシン制御の実装
- [ ] V1コードからのロジック移植と最終的な経済バランス調整
