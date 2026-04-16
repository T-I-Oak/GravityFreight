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

## 表示スタイル
- 原則: マットスタイル

