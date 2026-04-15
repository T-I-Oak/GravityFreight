# UI仕様: プレイ画面

## 目的
- 航行（物理シミュレーション）と、その前後の操作（建造、照準、発射）を提供する。

## 想定する状態（シーン）
- BUILDING
- AIMING
- FLYING
- REPLAYING（リプレイ再生時）

## モード
- normal: 通常プレイ（BUILDING / AIMING / FLYING を含む）
- replay: リプレイ再生（REPLAYING のみ）

## 主要UI
- 宇宙ビュー（星、ロケット、出口）
- HUD（所持、セクター、状態など）
- 建造UI（インベントリ、装備スロット、整備）
- 照準UI（角度、予測線、発射）
  - replay モードでは、建造UI/照準UIは表示しない
  - replay モードでは、再生UI（速度変更、一時停止、終了など）を表示する（詳細は後で定義）

## 入力
- マウス/タップ操作
- カメラ操作（ズーム/パン）
  - replay モードでは、航行に影響する入力は無効（観測操作のみ）

## 遷移
- BUILDING → AIMING
- AIMING → FLYING
- FLYING → FLIGHT_RESULT
- 任意 → MENU（中断/リタイアが必要なら定義）

## 表示スタイル
- 原則: ネオンスタイル

