# Specification: WorldRenderer Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 描画管理。
- **責務**:
    - PIXI.js を用いたゲーム画面の描画管理。
    - ステージ上のオブジェクト（Rocket, CelestialBody 等）の描画同期。
    - カメラ状態（CameraController）に基づいたワールド投影。

## 2. インターフェース (Interface)

### 描画仕様

- `#gameCanvas` に PIXI `Application` を接続し、ゲーム世界をレイヤー構造で描画する。
- マップ座標は CameraController の投影を使用し、背景は BackgroundManager が管理する。
- セクター境界、出口、天体、施設ラベル、船体、貨物、航跡、予測線、ソナー、航行終了演出を描画対象とする。
- 天体 glow、アイテム保持リング、細い境界線、太い発光 exit arc、施設ラベルの天地補正を持つ。
- `initialize()` は `HTMLCanvasElement`, `CameraController`, `BackgroundManager` を受け取り、PIXI 初期化を行うため `Promise<void>` を返す。`setSector()` 呼び出し時に Sector 表示を更新する。

### プロパティ (Properties)
- **`targetSector: Sector | null`**: 現在描画対象となっているセクターインスタンスへの参照。
- **`warpScale: number`**: 演出用の追加倍率（初期値 1.0）。描画時に `camera.zoomLevel` に乗算される。
- **`warpAlpha: number`**: 演出用の不透明度（初期値 1.0）。セクター内の全オブジェクトに適用される。
- **`canvas: HTMLCanvasElement` (Read-only)**: 描画対象 Canvas。v0.84 時点では `#gameCanvas` を直接使用する。
- **`camera: CameraController`**: 視界制御システムへの参照。
- **`background: BackgroundManager`**: 背景描画システムへの参照。
- **`sonarRange: number`**: 現在の回収可能範囲の最大半径。描画ループ内で最新のロケット状態（`rocketItem.pickupRange * rocketItem.pickupMultiplier`）を反映する。

### メソッド (Methods)
- **`initialize(canvas: HTMLCanvasElement, camera: CameraController, background: BackgroundManager): Promise<void>`**
    - PIXI.js の初期化と依存システムの紐付け、メインループの開始を行う。
    - 既存の `#gameCanvas` を PIXI `Application` の描画対象として使用し、背景・境界・出口・天体・ラベルの基本レイヤーを初期化する。
    - **内部挙動**:
        1. 引数で渡された `camera` および `background` を内部変数に保持する。
        2. `PIXI.Application` インスタンスを生成する（透明度・アンチエイリアス等の基本設定を含む）。
        3. `canvas` の親要素または Canvas 自身のサイズに合わせてレンダラーのサイズを初期設定する。
        4. `background`, `world`, `boundary`, `exits`, `bodies`, `labels` の最小レイヤーを生成し、`app.stage` に追加する。
        5. 初期化完了後、`BackgroundManager.initialize(view)` を呼び出して背景描画領域を確定させる。

- **`render(): void`**
    - メインの描画ループ。PIXI.js の Application Ticker から毎フレーム呼び出される。
    1. `this.background.renderPixi(graphics, view)` を呼び出し、背景を描画する。
    2. `targetSector` が存在する場合、その中の全オブジェクトを `CameraController.toScreen()` を用いてスクリーン上に描画する。
    3. 航行中または演出中、自律型オブジェクト（航跡、ソナー、貨物）の状態更新とフェード処理を実行する。

- **`setSector(sector: Sector | null): void`**
    - 描画対象とするセクターを差し替える。

- **`startNavigation(rocket: Rocket): void`**
    - 航行画面の描画を開始する。
    - **内部挙動**: ロケットの描画を有効化し、航跡の記録を開始する。

- **`enableSonar(): void`**
    - ソナー波紋の新規生成を開始する（AIM中および航行中）。
- **`disableSonar(): void`**
    - ソナー波紋の新規生成を停止する（既存の波紋は消滅まで描画を継続する）。

- **`playFinishAnimation(result: object): Promise<void>`**
    - 航行終了時の演出シーケンスを実行し、完了時に Promise を解決する。
    - **ステータス別の演出挙動**:
        - **`cleared`**: ロケットと貨物アイコンが出口の中心に吸い込まれるように縮小しながら消滅する。
        - **`crashed`**: 衝突地点で爆発エフェクトを表示し、ロケットアイコンを即座に消去する。
        - **`returned`**: 到着地点でロケットが静止し、フェードアウトする。
        - **`lost`**: ロケットアイコンがその場の透明度を下げて消失する。
    - **共通処理**: 残存する航跡・ソナー波紋がすべて消滅するまで待機する。

- **`startWarpEffect(duration: number): void`**
    - 現在のセクターから離脱し、ワープ空間へ突入する際の演出を実行する。
    - マップ全体がプレイヤーを追い越すように巨大化しながら透明度を下げ、視覚的に「消失」させる。
    - （内部実装: `animateWarpEffect(1.0, 1.0, 20.0, 0.0, duration)`）

- **`stopWarpEffect(duration: number): void`**
    - ワープを終了し、新しいセクターの入り口に到達した際の演出を実行する。
    - 新しいマップが遠方の極小点から急接近してくるようなスケーリングを行い、期待感を醸成する。
    - （内部実装: `animateWarpEffect(0.05, 1.0, 1.0, 1.0, duration)`）

- **`playGameEndExitAnimation(duration: number): Promise<void>`**
    - ゲームオーバー時の退場演出を実行する。
    - **内部挙動**:
        1. 現在のセクター表示を維持したまま、カメラまたはマップ表示を現在の宇宙から離脱する方向へ動かす。
        2. ゲームリザルトパネルが前面に重なるため、背景演出としてリザルト操作を妨げない状態を保つ。
        3. 演出完了時に Promise を解決する。

- **`animateWarpEffect(fromScale: number, fromAlpha: number, toScale: number, toAlpha: number, duration: number): void`** *(内部実装専用)*
    - `startWarpEffect()` / `stopWarpEffect()` から内部的に呼び出される。外部から直接呼び出してはならない。

- **`handleResize(width: number, height: number): void`**
    - ブラウザのウィンドウリサイズ等に同期して呼び出され、PIXI.js のレンダラーサイズを更新する。
    - 併せて `CameraController.handleResize()` および `BackgroundManager.handleResize()` を呼び出し、各コンポーネントにサイズ変更を通知する。

## 3. 描画階層 (Rendering Layers)

PIXI.js の `app.stage` 以下に、以下の Container 階層を構築して描画順序を制御する。

| レイヤー名 | 所属 | 役割 | 備考 |
| :--- | :--- | :--- | :--- |
| `backgroundContainer` | `stage` | 遠景（星々）の描画 | `BackgroundManager` が管理 |
| `worldContainer` | `stage` | カメラ変換を受ける全オブジェクト | `CameraController` が変換を適用 |
| ∟ `boundaryLayer` | `world` | セクター境界線 | 出口 arc の土台 |
| ∟ `exitArcLayer` | `world` | 出口 arc | 施設別の色で描画 |
| ∟ `celestialBodyLayer` | `world` | 天体（惑星・母星） | glow とアイテムリングを含む |
| ∟ `labelLayer` | `world` | 施設ラベル | 天地補正を適用 |
| ∟ `trajectoryLayer` | `world` | 予測軌道（軌道予測線） | エイミング中のみ表示 |
| ∟ `rocketTrailLayer` | `world` | ロケットの飛行軌跡 |  |
| ∟ `freightLayer` | `world` | 荷物（Freight） | ロケットに追従する貨物アイコン |
| ∟ `rocketLayer` | `world` | ロケット本体 |  |
| ∟ `sonarLayer` | `world` | ソナー波紋 | 中心から広がるリング状エフェクト |
| ∟ `effectLayer` | `world` | 爆発等の演出 |  |

- **描画順**: リストの下にあるものほど手前（前面）に描画される。
- **座標系**: `worldContainer` 以下のレイヤーはすべてワールド座標系（単位: world px）で配置される。

## 4. 各オブジェクトの描画仕様 (Object Rendering Specifications)

`WorldRenderer` は、セクター内の各データオブジェクトに対応する PIXI 要素を構築する。
- **描画順**: 3章と同様、リストの下にあるものほど手前（前面）に描画される。

### 4.1 天体 (CelestialBody)
天体ごとの `Container` 内に以下の要素を順に構築する。
- ∟ `glowSprite` (Glow): 円形グラデーションテクスチャによる発光（最背面）。
- ∟ `coreShape` (核): `PIXI.Graphics` による天体の実体。
- ∟ `itemIndicator` (リング): 保持アイテムのカテゴリ色リング（最前面）。

**ビジュアル要件**:
- **色適用**: `isRepulsion` (斥力) なら world repulsive star 色、`isHome` なら home star 色、それ以外は normal star 色を使用。
- **Glow**: 天体の背面に発光表現を置き、天体の種類ごとの色で周辺光を表現する。

### 4.2 出口 (ExitArc)
出口ごとの `Container` 内に以下の要素を順に構築する。
- ∟ `arcShape` (円弧): 境界線（900 world px）上に描画される太い円弧（最背面）。
- ∟ `facilityLabel` (施設名): 文字ごとの `PIXI.Text` による曲線ラベル。天地補正（Readable Flip）を適用。
- ∟ `deliveryIcon` (アイコン): 3D風の段ボールマーカー（最前面）。

**ビジュアル要件**:
- **天地補正 (Readable Flip)**: 画面下半分に位置する場合、ラベルとアイコンの両方を 180 度反転させ、常にプレイヤーから見て天地が正しくなるように制御する。
- **Arc 表現**: 発光用の太い半透明 stroke と、芯となる細い stroke の 2 重描画で表現する。施設ラベルは arc 外側へ配置する。
- **施設名ラベル**: 施設名は単一の水平テキストではなく、文字ごとに exit arc 外側の円周上へ配置する。文字ごとの角度間隔はフォントサイズと文字間隔から算出し、ラベル全体が施設 arc の中心角を中心として並ぶようにする。
- **ズーム追従**: 施設名ラベルのフォントサイズ、文字間隔、配置半径は `CameraController.zoomLevel` に完全追従し、ズーム時にマップと同じ倍率で拡大・縮小する。
- **カメラ回転**: ExitArc の配置角度には `CameraController.rotation` を加算して描画し、天体や境界線と同じ回転状態に同期させる。
- **エフェクト**: 
    - `StorySystem.isRead(currentPath + facilityID, true)` が `false`（＝そのルートの先に未読あり）の場合、配送アイコンを明滅させる。

### 4.3 セクター境界線 (Boundary Line)
`exitArcLayer` の最背面に、セクター全体の広さを示すガイドとして描画される。
- ∟ `boundaryShape`: 半径 900 world px の円。

**ビジュアル要件**:
- 出口（円弧）の土台として機能するため、出口よりも細い実線で描画される。

### 4.4 ソナー波紋 (Sonar Ripple)
- **基本構造**: 0.5 の位相差を持つ **2 つの同心円** で構成される。
- **発生間隔**: 1.0秒ごとに新しいパルスを開始（2 つの円が 2.0秒周期で交互に広がる状態を維持）。
- **挙動**: 発生地点（ロケット座標）を固定とし、2.0秒かけて半径 0px から `sonarRange` まで線形拡大する。
- **ビジュアル**: 
    - **ブレンド**: `Additive`。
    - **カラー**: `--color-ui-scanner` (`0x00FFCC`) を使用。
    - **不透明度**: 拡大率 `t (0.0~1.0)` に対し、`(1.0 - t) * 0.9` で減衰。
    - **形状**: 太さ 2.5px の円環（Stroke）と、不透明度 0.15 の塗り（Fill）。
- **終了時**: `disableSonar()` が呼ばれた瞬間、新しいパルスの発生のみを停止し、描画中の波紋は消滅するまで維持する。

### 4.5 航行終了演出 (Finish Animation)
- **物理停止後の挙動**: `GameController` が物理更新を止めた後も、以下のオブジェクトが消滅するまで描画ループを維持する。
    - **到着 (Cleared) / 帰還 (Returned)**: ロケットを中心に「施設への進入」をイメージした環状エフェクトが広がり、ロケットを包み込むように収束・消失する演出。
    - **破壊 (Crashed)**: その場で爆発パーティクルを生成。荷物（Freight）は既存の描画ロジック（軌跡追従）に従い、自然に衝突地点へと収束する。
    - **ロスト (Lost)**: 爆発とは異なる、虚空へパッと消えるような地味な消失演出。
    - **航跡・ソナー**: 全パーティクルが寿命で消滅するまで、フェードアウト描画を継続。
- **完了通知**: すべての演出が終了し、画面が静止またはリザルト表示に耐えうる状態になった時点で `playFinishAnimation` の Promise を解決する。

## 5. デザイン情報の取得 (Design Tokens)

`WorldRenderer` が描画に使用する色は、JS 内にハードコードせず、CSS 変数から取得する。

- **取得タイミング**: 初期化時、およびリサイズ（`handleResize`）時。
- **変換処理**: CSS のカラー文字列（`#RRGGBB`）を取得し、PIXI が解釈可能な数値形式（`0xRRGGBB`）へ変換して保持する。
- **色定義**: `css/design_tokens.css` の world / facility / category token から取得する。

## 6. カメラ行列の適用 (Camera Transformation)

ワールド座標系（セクター内）からスクリーン座標系（Canvas表示）への投影は、`CameraController` の変換結果を使用する。

- **行列の更新タイミング**: `CameraController` が座標・ズームを計算した直後。
- **適用フロー**:
    1. 天体などワールド座標を持つオブジェクトは `CameraController.toScreen()` でスクリーン座標へ変換する。
    2. 半径や stroke 幅など、距離に比例する値は `CameraController.zoomLevel` を乗算して描画する。
    3. ExitArc のように角度で定義される要素は、描画時に `CameraController.rotation` を加算する。
- **背景との同期**: 
    - `BackgroundManager` へ `rotation`, `position`, `zoomLevel` を含む view 情報を渡し、背景の回転中心とズーム中心をマップと同期させる。
    - 詳細は `BackgroundManager.md` を参照。
