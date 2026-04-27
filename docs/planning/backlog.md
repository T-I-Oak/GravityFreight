# Gravity Freight V2: Development Backlog

## 現在のタスク (Current Tasks)
- [ ] 各クラスの具体的なインターフェース（プロパティ・メソッド）の策定

    ### 1. Foundation & World (舞台と基盤)
    - [ ] Sector (セクター環境)
    - [ ] CelestialBody (天体・重力源)
    - [ ] ExitArc (目的地)

    ### 2. Core Flight & Physics (飛行と物理)
    - [ ] Rocket (物理実体・航跡保持)
    - [ ] PhysicsEngine (物理シミュレーター)
    - [ ] TrajectoryPredictor (軌道予測エンジン)

    ### 3. Player State & Economy (資産と経済)
    - [ ] Item (アイテム基底)
    - [ ] Inventory (プレイヤー所持品)
    - [ ] SessionState (セッション統計・HUDデータ)
    - [ ] EconomySystem (価格・報酬計算)

    ### 4. Progression & Content (進行と物語)
    - [ ] MissionController (セクター進行管理)
    - [ ] StorySystem (物語・既読管理)
    - [ ] AchievementTracker (累計統計・実績)
    - [ ] FlightRecorder (リプレイ・スナップショット)

    ### 5. View & Interaction (表示と描画)
    - [ ] WorldRenderer (ワールド描画)
    - [ ] CameraController (カメラ・座標変換)
    - [ ] BackgroundManager (遠景演出)
    - [ ] UIController (表示・画面遷移)

    ### 6. Orchestration (全体統括)
    - [ ] GameOrchestrator (全体統括・ステートマシン)

## 今後のロードマップ (Roadmap)
- [ ] World Domain の実装と単体テスト
- [ ] Entity Domain の実装と単体テスト
- [ ] Logic Domain の実装と単体テスト
- [ ] System Domain の実装と統合
- [ ] メインゲームループの結合とステートマシン制御の実装
- [ ] V1コードからのロジック移植と最終的な経済バランス調整
