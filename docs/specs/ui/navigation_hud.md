# UI Specification: Navigation HUD (SCR-NAV)

## 1. 概要 (Overview)
航行中のプレイヤーに対し、現在のセクター状況、報酬の獲得状況、および資産状況をリアルタイムに提示するためのインターフェース。

## 2. 表示項目 (UI Elements)

| 項目名 | 内容 | 更新タイミング | 演出 |
| :--- | :--- | :--- | :--- |
| **セクター番号** | 現在探索中のセクター数 | 航行開始時のみ | なし |
| **累計スコア** | `SessionState.score + Current Ticks` | 1ティックごと | **ロールカウンター** |
| **所持コイン** | `SessionState.coins` (航行開始時の値) | 航行開始時のみ | なし |

## 3. 演出規則 (Animation Rules)

### 3.1 ロールカウンター (Rolling Counter)
スコア等の「真の値」が頻繁に更新される項目に対し、滑らかな視覚的フィードバックを提供する。

- **表示用の値 (Displayed Value)**: コンポーネント内部で保持する、描画用の数値。
- **更新ロジック**: 
    - 「真の値」が更新された際、表示用の値を目標値（真の値）に向けて一定のステップ数で加算する。
    - 補間速度は、1フレームあたりの増加量が「(目標値 - 表示用の値) / 10」程度となる指数関数的な収束、または一定速度の加算を採用する。
    - 真の値と表示用の値が一致した時点で更新を停止する。

## 4. インターフェース (Control Interface)

### 4.1 UIController からの操作
HUD コンポーネントは、`UIController` を通じて以下の命令を受け取る。

- `initHUD(data: { sector: number, baseScore: number, ownedCoins: number })`
    - HUD の表示内容を初期化する。航行開始時に呼び出される。
- `updateHUDValue(key: string, value: number)`
    - 指定したキー（例: `'score'`）の「真の値」を更新し、アニメーションを開始させる。
