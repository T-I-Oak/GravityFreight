# Specification: TitleScreenAnimator Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: タイトル画面専用の Canvas 演出管理。
- **責務**:
    - タイトル画面の星背景、ロケット周回、航跡、貨物追従を描画する。
    - タイトル画面表示中だけ描画ループを実行し、画面遷移時に停止する。
    - `BackgroundManager` をゲーム本編と共有し、タイトル画面からセクター開始演出まで星背景の連続性を保つ。

## 2. 責務境界

- `TitleScreenAnimator` はタイトル画面の見た目だけを扱い、ゲーム進行、物理シミュレーション、リプレイ、保存データには関与しない。
- タイトル用ロケットはゲーム内 `Rocket` を継承しない。`Rocket` は発射構成、物理状態、航行結果、snapshot を持つ Flight Lifecycle の実体であり、タイトル画面の装飾表現とは責務が異なる。
- タイトル用ロケットは、楕円軌道上の表示位置、向き、前後関係、航跡、貨物表示に必要な最小情報だけを持つ軽量な表示モデルとして扱う。
- `UIController` はタイトル画面の表示・非表示と DOM 要素取得を担当する。Canvas 演出の進行、描画、停止は `TitleScreenAnimator` が担当する。
- `AppOrchestrator` は `TitleScreenAnimator` と `WorldRenderer` に同じ `BackgroundManager` インスタンスを渡し、タイトル画面と本編描画のライフサイクルを接続する。

## 3. インターフェース (Interface)

### プロパティ (Properties)

- **`backgroundCanvas: HTMLCanvasElement`**:
    - タイトル画面の背面 Canvas。星背景、奥側の航跡、奥側のロケット、奥側の貨物を描画する。
- **`foregroundCanvas: HTMLCanvasElement`**:
    - タイトル画面の前面 Canvas。手前側の航跡、手前側のロケット、手前側の貨物を描画する。
- **`backgroundManager: BackgroundManager`**:
    - ゲーム全体で共有する星背景管理クラス。
    - タイトル専用に別インスタンスを作成してはならない。
- **`colorPalette: CanvasColorPalette`**:
    - Canvas 描画色を `css/design_tokens.css` の token から解決する参照。
- **`phase: number`**:
    - タイトル用ロケットの楕円軌道上の現在位相。
- **`trail: TitleTrailPoint[]`**:
    - タイトル用ロケットの過去位置。
    - 各点は `x`, `y`, `angle`, `isFront` を持つ。
- **`isRunning: boolean`**:
    - 描画ループの実行状態。

### メソッド (Methods)

- **`initialize(canvases: { background: HTMLCanvasElement, foreground: HTMLCanvasElement }, backgroundManager: BackgroundManager): void`**
    - タイトル用 Canvas 群と共有 `BackgroundManager` を受け取り、描画に必要な context を取得する。
    - Canvas が存在しない、または context を取得できない場合は初期化エラーとして例外を投げる。
    - `BackgroundManager.initialize()` は星が未生成の場合のみ実行し、既に存在する星配列をタイトル表示のために作り直してはならない。

- **`start(): void`**
    - タイトル画面の描画ループを開始する。
    - 既に実行中の場合は重複して animation frame を登録しない。

- **`stop(): void`**
    - タイトル画面の描画ループを停止する。
    - 停止時に `BackgroundManager` の星配列や `warpSpeed` をリセットしない。

- **`render(deltaSeconds: number, timestamp: number): void`**
    - Canvas サイズを表示領域へ同期し、背面 Canvas と前面 Canvas を描画する。
    - 背面 Canvas に `BackgroundManager.update(deltaSeconds)` と `BackgroundManager.render(context, titleView)` を適用する。
    - タイトル用ロケットの楕円軌道位置を更新し、`isFront` に応じて背面または前面 Canvas へ描画する。
    - DOM のタイトルロゴ、メニューボタン、設定アイコン、フッターは Canvas では描画しない。

- **`handleResize(width: number, height: number): void`**
    - タイトル用 Canvas の表示サイズと内部解像度を更新する。
    - `BackgroundManager.handleResize()` へ表示領域を通知するが、星の連続性を壊す再生成は行わない。

## 4. 描画仕様

### 4.1 レイヤー構成

タイトル画面は以下の重なり順で表示する。

| レイヤー | 役割 |
| :--- | :--- |
| `title-bg-canvas` | 共有星背景、奥側のロケット、奥側の航跡、奥側の貨物 |
| DOM UI | `logo.svg`、メニューボタン、設定アイコン、バージョン・コピーライト |
| `title-fg-canvas` | 手前側のロケット、手前側の航跡、手前側の貨物 |

- `title-fg-canvas` はポインター操作を阻害しない。
- 設定アイコンは前面 Canvas より上位のシステム操作レイヤーに表示し、タイトル画面から設定画面を開ける状態にする。
- `logo.svg` とメニューボタンを含むタイトル UI 全体は、6 秒周期で上下 12px 程度の待機アニメーションを行う。
- ボタンの glass 表現確認用に使っていた説明書画像は正式タイトル画面では使用しない。

### 4.2 星背景

- タイトル画面の星背景は必ず `BackgroundManager` で描画する。
- `TitleScreenAnimator` と `WorldRenderer` は同じ `BackgroundManager` インスタンスを共有する。
- タイトル画面からゲーム開始、セクター開始ワープ、本編マップ表示へ遷移しても、星の位置・奥行き・流速は不連続にリセットされない。
- タイトル画面ではゲームカメラに依存しない表示 view を使用する。初期仕様では `rotation: 0`, `offset: { x: 0, y: 0 }`, `zoomLevel: 1` とする。

### 4.3 タイトル用ロケット

- タイトル用ロケットは、画面中心を基準とした楕円軌道を周回する。
- 楕円の長軸角度は、現在の viewport の対角線角度を反転した角度に合わせる。
- 楕円の長径は viewport 対角線の約 64% を上限の基準とし、実際には画面端から安全マージンを確保して、軌道全体が viewport からはみ出さない値に収める。
- 楕円の短径は長径の約 35% を基準とし、メニューボタンの奥側を通過する奥行き表現と、画面端からの安全マージンを両立する範囲で調整する。
- 奥側の軌道は遠近感を表すために少し圧縮し、ロケットがメニューボタンの背面を通過して glass 表現が確認できる見え方にする。
- 位相更新速度は 0.9 rad/sec を基準とし、実装では frame rate に依存しない `deltaSeconds` ベースで更新する。
- `Math.sin(phase) > 0` の区間を手前側、それ以外を奥側として扱う。
- ロケットの向きは、奥行きスケール適用後の画面上の直前座標から現在座標への移動方向を基準にする。直前座標がない場合や移動量が極小の場合のみ、楕円の接線方向を fallback として使う。
- 航跡は一定数の履歴だけを保持し、古い点から自然に消える。
- 航跡色は本編航行画面と同じ `--color-world-trail` を `CanvasColorPalette` 経由で参照する。
- 航跡の明度は前面/背面 Canvas ごとではなく、全体の履歴位置に基づいて決定し、Canvas 切替地点で明度が不連続にならないようにする。
- タイトル用ロケット本体は小型の三角形シルエットとし、先端 10px、後端 -6px、上下 5px 程度の寸法で描画する。大きくしすぎると回転角の違和感が目立つため、タイトル演出では本編より控えめなサイズにする。
- タイトル用ロケット本体は、航跡終端の座標を中心として描画する。
- 貨物はロケットの少し後方の航跡点を追従し、ロケットと同じ前後関係で描画する。

### 4.4 ロゴとフッター

- タイトル画面のロゴはテキスト見出しではなく `logo.svg` を使用する。
- HUD に表示するタイトルロゴも `logo.svg` を使用し、タイトル画面と同じアセットを参照する。
- バージョン表示は `package.json` 由来のアプリバージョンを使用し、表示形式は `Ver {version}` を基本とする。
- コピーライト情報は HTML にハードコードせず、アプリ定数またはリソースから取得する。
- バージョン・コピーライトはタイトル画面下部のフッターに表示し、星背景上で十分に読める視認性を保つ。フッターは画面端に張り付けず、文字色は `rgba(255, 255, 255, 0.55)`、文字サイズは `13px`、字間は `1.5px`、太さは `700` を基準とする。バージョン表示、コピーライト、ポータルリンクは同じ文字色・太さ・不透明度で表示する。
- コピーライト表示にはポータルへのリンクを含める。
    - 表示名: `GameWorks OAK`
    - URL: `https://t-i-oak.github.io/GameWorksOAK/`
    - 外部リンクは `target="_blank"` と `rel="noopener noreferrer"` を付与する。

## 5. テスト観点

- `TitleScreenAnimator` は `WorldRenderer` と同じ `BackgroundManager` インスタンスを受け取る。
- タイトル表示開始・停止で `BackgroundManager` の星配列や warp 状態がリセットされない。
- `start()` の重複呼び出しで animation frame が重複登録されない。
- `stop()` 後にタイトル Canvas の描画ループが停止する。
- 背面 Canvas、DOM UI、前面 Canvas の重なり順が仕様通りである。
- ロゴ表示は `logo.svg` を参照し、タイトル画面と HUD で別表現を持たない。
- コピーライト表示にポータルリンクが含まれる。
