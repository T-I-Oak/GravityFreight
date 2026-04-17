# UI仕様: 航行結果画面

## 目的
- 1回の航行結果（獲得/損失/スコア内訳）を提示し、次の行動へ繋ぐ。

## 想定する状態（シーン）
- FLIGHT_RESULT

## 主要UI
- 結末（Success / Returned / Lost / Crashed）
- 獲得物（コイン、パーツ、貨物の扱い）
- スコア（航行時間/ボーナス内訳）
- 次へ進む導線

## 入力
- 続行ボタン

## 遷移
- 成功時: FLIGHT_RESULT → FACILITY
- 帰還時: FLIGHT_RESULT → PLAY（BUILDING）
- 失敗時: FLIGHT_RESULT → PLAY（BUILDING）
- ゲームオーバー時: FLIGHT_RESULT → GAME_RESULT

## 獲得アイテム（Space Assets）の表示ルール
- **優先順位**: 
    - ストーリー関連アイテム (`.is-story`) はリストの最上位に表示する。
    - 次いで、特殊配送物、通常パーツの順に並べる。
- **配送ステータス (`.item-card__status`)**: 
    - 特定の施設への配送が完了した際、および失敗した際に表示する。
    - 成功: `✓ DELIVERED` (Green)
    - 失敗（不一致）: `✗ UNMATCHED` (Red)
- **報酬アイテムの階層表示**: 
    - 配送成功によって獲得した報酬アイテムは、専用コンテナ `.item-card__bonus-items` で包んで親アイテムの直下に配置する。
    - このコンテナにより、親子関係を示すインデントと垂直ガイドラインが自動的に適用される。

## 表示スタイル
- 原則: マットスタイル

