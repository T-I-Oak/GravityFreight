# 配送レポート（レシート）とゲームオーバー・フローの実装タスク

- [x] `Game.js`: 累積統計 `stats.totalDeliveries` の追加と `returnToTitle()` の実装
- [x] `MissionSystem.js`: 貨物配達成功時の `stats.totalDeliveries` 加算処理
- [ ] `ui.css`: レシート風デザイン（ギザギザの縁、等幅系フォント）とスライドアニメーションの実装
- [ ] `UISystem.js`: 配送レポート（レシート）の描画ロジック `showTerminalReport()` の追加
- [ ] `EventSystem.js`: セクターリザルト終了時のゲームオーバー判定と、レシート表示・タイトル遷移の制御
- [ ] [STOP!] 開発完了時にユーザーの承認を得る

## 継続改善・不具合修正
- [ ] 不具合: crashした次のエイムで方向未設定のとき、crashした星にロケットが表示され続けている
