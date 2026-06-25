# Specification: WorldRenderer Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: ゲーム画面の描画管理。
- **責務**:
    - `#gameCanvas` の Canvas 2D context を用いてゲーム画面を描画する。
    - `BackgroundManager` による遠景描画と、セクター内オブジェクトの描画順を統合する。
    - `CameraController` の投影結果に基づき、ワールド座標系（単位: world px）をスクリーン座標系へ変換して描画する。

## 2. インターフェース (Interface)

### 描画仕様

- `#gameCanvas` の `CanvasRenderingContext2D` を描画対象とする。
- マップ座標は `CameraController` の投影を使用し、背景は `BackgroundManager` が管理する。
- セクター境界、出口、天体、施設ラベル、船体、貨物、航跡、予測線、ソナー、航行終了演出を描画対象とする。
- 天体 glow、アイテム保持リング、細い境界線、太い発光 exit arc、施設ラベルの天地補正を持つ。
- `initialize()` は `HTMLCanvasElement`, `CameraController`, `BackgroundManager` を受け取り、Canvas 2D context と依存システムを初期化するため `Promise<void>` を返す。
- `setSector()` 呼び出し時に、描画対象の Sector 表示を更新する。

### プロパティ (Properties)

- **`targetSector: Sector | null`**: 現在描画対象となっているセクターインスタンスへの参照。
- **`canvas: HTMLCanvasElement`**: 描画対象 Canvas。
- **`context: CanvasRenderingContext2D`**: Canvas 2D 描画 context。
- **`camera: CameraController`**: 視界制御システムへの参照。
- **`backgroundManager: BackgroundManager`**: 背景描画システムへの参照。
- **`colorPalette: CanvasColorPalette`**: Canvas 描画色を `css/design_tokens.css` の token から解決する参照。
- **`flightVisualRenderer: FlightVisualRenderer`**: 航行中および AIM 中のロケット周辺ビジュアル描画を担当する補助描画クラス。
- **`navigationRocket: Rocket | null`**: 航行中に描画対象となるロケットインスタンスへの参照。
- **`aimRocket: Rocket | null`**: AIM 中に描画対象となるプレビュー用ロケットインスタンスへの参照。
- **`predictionPath: { x: number, y: number }[]`**: AIM 中に描画する予測軌道の座標列。
- **`sonarEnabled: boolean`**: ロケット回収範囲を示すソナー波紋の描画状態。
- **`sonarStopTimestamp: number | null`**: ソナーの新規波紋生成を停止した時刻。既存波紋の自然消滅に使用する。
- **`hideNavigationRocketBody: boolean`**: 航行終了演出中に、ロケット本体だけを非表示にする状態。
- **`mapWarp: object`**: セクター遷移中のマップ表示倍率・透明度・補間状態。背景ではなくセクター内オブジェクト全体の拡縮を担当する。

### メソッド (Methods)

- **`initialize(canvas: HTMLCanvasElement, camera: CameraController, background: BackgroundManager): Promise<void>`**
    - Canvas 2D context の取得と依存システムの紐付けを行う。
    - **内部挙動**:
        1. 引数で渡された `camera` および `background` を内部変数に保持する。
        2. `canvas.getContext('2d')` で描画 context を取得する。
        3. Canvas サイズを表示領域と `devicePixelRatio` に同期させる。
        4. `BackgroundManager.initialize(view)` を呼び出して背景描画領域を確定させる。
        5. 初期描画として `render()` を実行する。
        6. `requestAnimationFrame` による描画ループを開始し、背景の星の移動・瞬き・ワープ演出を継続更新する。

- **`render(): void`**
    - メインの描画処理。
    1. Canvas サイズを現在の表示領域に同期する。
    2. `BackgroundManager.update(deltaSeconds)` と `BackgroundManager.render(context, view)` を呼び出し、背景を描画する。
    3. `targetSector` が存在する場合、セクター境界、出口、天体を `CameraController.toScreen()` を用いてスクリーン上に描画する。
    4. `predictionPath` または `navigationRocket` が存在する場合、`FlightVisualRenderer.render()` に航行中ビジュアルの描画を委譲する。
    - `render()` は `requestAnimationFrame` から継続的に呼び出される。入力イベント等から即時再描画が必要な場合も同じ `render()` を呼び出してよい。

- **`setSector(sector: Sector | null): void`**
    - 描画対象とするセクターを差し替える。

- **`clearSector(): void`**
    - 描画対象セクターを `null` にし、背景のみを描画する状態へ戻す。
    - 新規ゲーム開始時など、前回ゲームのマップを表示してはいけないタイミングで呼び出す。

- **`startNavigation(rocket: Rocket): void`**
    - 航行画面の描画を開始する。
    - **内部挙動**: `navigationRocket` として受け取った Rocket を保持し、ロケット本体、`actualTrail`、`heldCargo` の描画対象にする。航跡データそのものの更新は `Rocket.updateState()` の責務とする。

- **`setAimRocket(rocket: Rocket): void`**
    - AIM 中のロケット表示を開始・更新する。
    - **内部挙動**: `aimRocket` として受け取ったプレビュー用 Rocket を保持し、実航行前でもロケット本体とソナーの描画対象にする。

- **`clearAimRocket(): void`**
    - AIM 中のロケット表示を消去する。
    - 発射確定時や AIM 不可能状態へ戻る時に呼び出す。

- **`setPredictionPath(points: { x: number, y: number }[]): void`**
    - AIM 中に表示する予測軌道の座標列を更新する。
    - **内部挙動**: 受け取った座標列を `predictionPath` として保持し、即時再描画する。

- **`clearPredictionPath(): void`**
    - AIM 解除、発射確定、セクター切替等で予測軌道表示を消去する。

- **`enableSonar(): void`**
    - ソナー波紋の新規生成を開始する（AIM中および航行中）。
- **`disableSonar(): void`**
    - ソナー波紋の新規生成を停止する（既存の波紋は消滅まで描画を継続する）。

- **`playFinishAnimation(result: object): Promise<void>`**
    - 航行終了時の演出シーケンスを実行し、完了時に Promise を解決する。
    - `result` を受け取り、将来的な終了状態別エフェクト（ロスト、破壊、施設進入、帰還など）の分岐点とする。
    - **ステータス別の演出挙動**:
        - **`cleared`**: ロケットと貨物アイコンが出口の中心に吸い込まれるように縮小しながら消滅する。
        - **`crashed`**: 衝突地点で爆発エフェクトを表示し、ロケットアイコンを即座に消去する。
        - **`returned`**: 到着地点でロケットが静止し、フェードアウトする。
        - **`lost`**: ロケットアイコンがその場の透明度を下げて消失する。
    - **共通処理**:
        - ロケットの物理位置は変更しない。
        - 航行終了後はロケット本体を描画しない。ロスト、破壊、施設進入、帰還のいずれもロケットは終了地点から消える扱いとする。
        - 一定時間、`Rocket.recordTrailPoint(rocket.position)` を継続し、古い航跡を最大長から押し出す。
        - 保持アイテムは通常の航跡追従描画を続けるため、ロケット位置へ吸い込まれるように見える。
        - 残存する航跡・ソナー波紋が消滅するまで待機する。
        - 演出完了後は `navigationRocket` をクリアし、航行結果画面でマップを再表示してもロケット本体、航跡、保持アイテムを再描画しない。

- **`startWarpEffect(duration: number): void`**
    - 現在のセクターから離脱し、ワープ空間へ突入する際の演出を開始する。
    - 背景の星の流速は `BackgroundManager` が管理する。
    - セクター内オブジェクトは Canvas 中心を基準に Scale 1.0→100.0、Alpha 1.0→0.0 へ補間する。

- **`stopWarpEffect(duration: number): void`**
    - ワープを終了し、新しいセクターの入り口に到達した際の演出を終了する。
    - 背景の星の流速は `BackgroundManager` が通常状態へ戻す。
    - セクター内オブジェクトは Canvas 中心を基準に Scale 0.01→1.0、Alpha 1.0 のまま補間する。

- **`playGameEndExitAnimation(duration: number): Promise<void>`**
    - ゲームオーバー時の退場演出を実行する。
    - **内部挙動**:
        1. 現在のセクター表示を維持したまま、通常のセクター開始ワープとは逆方向の退場ワープを開始する。
        2. 通常ワープは前セクターのマップへズームインして次セクター方向へ進むが、ゲームオーバー演出では現在マップからズームアウトして、スタートのセクター方向へ戻るように見せる。
        3. 背景の星は `BackgroundManager.startReverseWarpEffect()` で逆方向へ流し、マップは縮退・遠ざかり方向の補間を行う。
        4. マップは一定サイズまで縮退した後、中央に残り続けないように透明度を下げて消す。
        5. ゲームリザルトパネルが前面に重なるため、背景演出としてリザルト操作を妨げない状態を保つ。

- **`stopGameEndExitAnimation(duration: number): Promise<void>`**
    - `END CONTRACT` 押下後、ゲームオーバー退場ワープを減速してタイトル復帰可能な通常背景状態へ戻す。
    - **内部挙動**:
        1. 背景のワープ速度を通常速度へ補間する。
        2. マップの退場ワープ補間を停止し、タイトル画面へ戻る前に描画状態をリセットできる状態にする。
        3. 演出完了時に Promise を解決する。

- **`handleResize(width: number, height: number): void`**
    - ブラウザのウィンドウリサイズ等に同期して呼び出され、Canvas サイズを更新する。
    - 併せて `CameraController.handleResize()` および `BackgroundManager.handleResize()` を呼び出し、各コンポーネントにサイズ変更を通知する。

## 3. 描画階層 (Rendering Layers)

Canvas 2D の描画順序として、以下の論理レイヤー順に描画する。

| レイヤー名 | 役割 | 備考 |
| :--- | :--- | :--- |
| `background` | 遠景（星々）の描画 | `BackgroundManager` が管理 |
| `boundary` | セクター境界線 | 出口 arc の土台 |
| `exitArc` | 出口 arc | 施設別の色で描画 |
| `celestialBody` | 天体（惑星・母星） | glow とアイテムリングを含む |
| `label` | 施設ラベル | 天地補正を適用 |
| `trajectory` | 予測軌道（軌道予測線） | エイミング中のみ表示 |
| `rocketTrail` | ロケットの飛行軌跡 |  |
| `freight` | 荷物（Freight） | ロケットに追従する貨物アイコン |
| `rocket` | ロケット本体 |  |
| `sonar` | ソナー波紋 | 中心から広がるリング状エフェクト |
| `effect` | 爆発等の演出 |  |

- **描画順**: リストの下にあるものほど手前（前面）に描画される。
- **座標系**: 論理レイヤーはすべて同じ Canvas に描画され、座標変換は `CameraController` の投影結果で統一する。

## 4. 各オブジェクトの描画仕様 (Object Rendering Specifications)

`WorldRenderer` は、セクター内の各データオブジェクトを Canvas 2D の描画命令として描画する。

### 4.1 天体 (CelestialBody)

- `isRepulsion` (斥力) なら world repulsive star 色、`isHome` なら home star 色、それ以外は normal star 色を使用。
- 天体の実体は円で描画し、同色の `shadowBlur` による glow を持つ。
- アイテムを保持する天体は、保持アイテムのカテゴリ色を用いたリングを外周に描画する。
- アイテムカテゴリは実データの小文字カテゴリ（例: `coin`, `launcher`）をそのまま描画色キーとして使用する。描画色は `CanvasColorPalette` 経由で `css/design_tokens.css` の `--color-category-*` を参照し、UI の ItemCard と同じカテゴリ認識になるようにする。
- 天体座標は `CameraController.toScreen(body.position)` で投影し、半径は `body.radius * camera.zoomLevel` で描画する。

### 4.2 出口 (ExitArc)

- 出口は境界線（900 world px）上の円弧として描画する。
- 施設種別ごとの色で、発光を伴う太い stroke を描画する。
- セクター内の天体に、その施設を `deliveryGoalId` とする配送対象 `cargo` が存在する場合、arc 外側に cargo アイコンを描画する。`deliveryGoalId` を持たない特殊 cargo は配送対象ではないため、このアイコンの対象外とする。
    - アイコンは対象施設の色で描画し、カテゴリ cargo 色は使用しない。
    - 配置半径は exit arc の半径 +85 world px を基準とし、カメラズームに追従させる。
    - 形状は 3/4 ビューの箱型アウトラインとし、外郭、内部稜線、上面テープ線を stroke で描画する。
    - `0.5 + 0.5 * sin(timestamp / 333)` の alpha でゆっくり明滅させる。
- 施設名は単一の水平テキストではなく、文字ごとに exit arc 外側の円周上へ配置する。
- 文字ごとの角度間隔はフォントサイズ、文字幅、文字間隔から算出し、ラベル全体が施設 arc の中心角を中心として並ぶようにする。
- **天地補正 (Readable Flip)**: 画面下半分に位置する場合、文字の並びと向きを反転し、常にプレイヤーから見て天地が正しくなるように制御する。
- **ズーム追従**: 施設名ラベルのフォントサイズ、文字間隔、配置半径は `CameraController.zoomLevel` に追従し、ズーム時にマップと同じ倍率で拡大・縮小する。
- **カメラ回転**: ExitArc の配置角度には `CameraController.rotation` を加算して描画し、天体や境界線と同じ回転状態に同期させる。
- **エフェクト**:
    - `StorySystem.isRead(currentPath + facilityID, true)` が `false`（＝そのルートの先に未読あり）の場合、配送アイコンを明滅させる。

### 4.3 セクター境界線 (Boundary Line)

- セクター全体の広さを示すガイドとして、半径 900 world px の円を描画する。
- 出口（円弧）の土台として機能するため、出口よりも細い実線で描画される。

### 4.4 ソナー波紋 (Sonar Ripple)

- **基本構造**: 0.5 の位相差を持つ **2 つの同心円** で構成される。
- **発生間隔**: 1.0秒ごとに新しいパルスを開始（2 つの円が 2.0秒周期で交互に広がる状態を維持）。
- **挙動**: 発生地点（ロケット座標）を固定とし、2.0秒かけて半径 0 world px から `sonarRange` まで線形拡大する。
- **ビジュアル**:
    - **カラー**: `--color-ui-scanner` を使用。
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

`WorldRenderer` が描画に使用する色は、最終的には CSS 変数から取得する。

- **取得タイミング**: 初期化時、およびリサイズ（`handleResize`）時。
- **変換処理**: Canvas 2D が解釈可能な CSS カラー文字列として保持する。
- **色定義**: `css/design_tokens.css` の world / facility / category token から取得する。

## 6. カメラ行列の適用 (Camera Transformation)

ワールド座標系（セクター内）からスクリーン座標系（Canvas表示）への投影は、`CameraController` の変換結果を使用する。

- **適用フロー**:
    1. 天体などワールド座標を持つオブジェクトは `CameraController.toScreen()` でスクリーン座標へ変換する。
    2. 半径や stroke 幅など、距離に比例する値は `CameraController.zoomLevel` を乗算して描画する。
    3. ExitArc のように角度で定義される要素は、描画時に `CameraController.rotation` を加算する。
    4. セクター遷移中は `mapWarp.scale` を追加で乗算し、Canvas 中心を基準にマップ全体を拡縮する。
- **背景との同期**:
    - `BackgroundManager` へ `rotation`, `position`, `zoomLevel` を含む view 情報を渡し、背景の回転中心とズーム中心をマップと同期させる。
    - 詳細は `background_manager.md` を参照。
