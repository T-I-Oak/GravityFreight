# Core Scenarios (コアシナリオ定義書)

本ドキュメントは、Gravity Freight V2 のシステムを駆動するための主要なユースケース（シナリオ）を定義する。
このシナリオを順番にトレースすることで、各クラスに必要なメソッドと相互作用（メッセージパッシング）を設計・注入していく。

## 1. 分析対象シナリオ一覧

### シナリオA: セクター環境の構築と入場 (Sector Initialization)
**概要**: 新しいセクター（ステージ）に入場し、天体や目的地が配置されるまでの流れ。
**登場する主要クラス**: `MissionController`, `Sector`, `SessionState`, `CelestialBody`, `ExitArc`, `DataManager`

### シナリオB: ロケットの発射と物理航行 (Physics & Navigation)
**概要**: プレイヤーがロケットを発射し、重力に引かれながら宇宙空間を移動し、衝突判定を行うまでの毎フレーム（Tick）の処理。
**登場する主要クラス**: `PhysicsEngine`, `Rocket`, `Sector`, `CelestialBody`, `ExitArc`

### シナリオC: アイテムの回収と船体ダメージ (Collection & Damage)
**概要**: ロケットが天体に衝突（または接近）した際、アイテムを回収し、船体がダメージを受ける（あるいは回避する）処理。
**登場する主要クラス**: `Rocket`, `CelestialBody`, `Inventory`

### シナリオD: セクタークリアとリザルト精算 (Clear & Economy)
**概要**: ロケットが目的地（ExitArc）に到達し、持ち帰ったアイテムが査定され、資産として計上されるまでの流れ。
**登場する主要クラス**: `EconomySystem`, `Rocket`, `ExitArc`, `SessionState`, `Inventory`, `AchievementTracker`

---

*※ 各シナリオの具体的なステップとメッセージパッシング（メソッド呼び出し）の詳細は、設計プロセス（No.3）の中でこのドキュメントに追記していく。*
