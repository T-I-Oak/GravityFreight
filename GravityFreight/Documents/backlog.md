# 配送レポート（レシート）とゲームオーバー・フローの実装タスク

- [x] `Game.js`: 累積統計 `stats.totalDeliveries` の追加と `returnToTitle()` の実装
- [x] `MissionSystem.js`: 貨物配達成功時の `stats.totalDeliveries` 加算処理
- [ ] `ui.css`: レシート風デザイン（ギザギザの縁、等幅系フォント）とスライドアニメーションの実装
- [ ] `UISystem.js`: 配送レポート（レシート）の描画ロジック `showTerminalReport()` の追加
- [ ] `EventSystem.js`: セクターリザルト終了時のゲームオーバー判定と、レシート表示・タイトル遷移の制御
- [ ] [STOP!] 開発完了時にユーザーの承認を得る

## 継続改善・不具合修正
- [ ] 画面微調整: タイトル画面のロケット軌道の調整
- [ ] 画面微調整: `launch engine` ボタンの枠色調整
- [ ] `MissionSystem.js`: デバッグ用のアイテム配置処理（Lucky Spark, 100 Credits）の強制追加を削除
- [ ] 不具合: crashした次のエイムで方向未設定のとき、crashした星にロケットが表示され続けている
- [ ] 不具合: エイムで方向未指定のまま発射すると予測通りの軌道にならない

## 仕様とテストの整合性確保
- [ ] `Tests/EconomySystem.test.js`: アイテム配置数の期待値を1-2個に修正（現状デバッグ用の2個加算により失敗すること＝デバッグ状態であることを検出）
- [ ] `Tests/Game.test.js`: 初期アイテムリスト（全9種）と初期所持金（0c）の検証を追加
- [ ] `Tests/PhysicsOrchestrator.test.js`: 特異点回避 ($r < 10$) の境界値テストを追加
- [ ] `Tests/MissionSystem.test.js`: 目的地報酬（2000/20c等）および貨物配送ボーナス（1500/100c）の数値検証を追加
- [ ] `Tests/EconomySystem.test.js`: 出現率（5/10/15）とセクターしきい値（14+S）の重み付け抽選の検証を追加
- [ ] `Tests/EnhancementLogic.test.js`: 修理費用（20c）と強化費用の累積増分（+50c/回）の検証を追加
- [ ] `Tests/EconomySystem.test.js`: 複数保険モジュール装備時の重複支払いロジックの検証を追加
- [ ] `Tests/MissionSystem.test.js`: 磁気パルス（25ティックで1px拡大）の動的数値検証を追加
