# Specification: CameraController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: カメラ制御。
- **責務**:
    - ズーム、パン、および回転（原点中心）を含む視界管理。
    - ワールド絶対座標からスクリーン座標への変換ロジックの提供。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`position: Vector2`**: カメラのパン位置。`toScreen()` 内でワールド座標を回転した後のスクリーン軸相当の座標として保持する。
- **`rotation: number`**: ワールド座標 (0, 0) を中心としたカメラの回転角（ラジアン）。
- **`zoomLevel: number`**: 表示倍率。
- **`viewportSize: Vector2`**: 現在の表示領域（キャンバス）の幅と高さ。※実行時のみ保持し、永続化は行わない。

### メソッド (Methods)
- **`initialize(): void`**
    - `GameDataRepository.getSavedCameraState(migrationMap)` を実行し、永続化されている設定値を自身に適用する。
    - `migrationMap` の `init` では、デフォルトのカメラ状態（position: {0,0}, rotation: 0, zoomLevel: 1.0）を返す。
    - ※カメラ状態はセクター遷移やミッション再開時に自動リセットされない。

- **`toScreen(worldPos: Vector2): Vector2`**
    - ワールド絶対座標（母星原点）をスクリーン座標（画面左上原点）に変換する。
    - **変換順序**:
        1. ワールド原点 `(0, 0)` を中心としたカメラの `rotation` による回転。
        2. 回転後の座標から `position` を減算。
        3. `zoom` 倍率を適用。
        4. `viewportSize` の半分をオフセットとして加算し、ワールド原点が画面中心に来るように調整する。

- **`handleResize(width: number, height: number): void`**
    - キャンバスサイズの変更を通知し、内部の `viewportSize` を更新する。
    - 描画エンジン（WorldRenderer）等のリサイズイベントに同期して呼び出される。

- **`toWorld(screenPos: Vector2): Vector2`**
    - スクリーン座標をワールド絶対座標に逆変換する。

- **`isInMapArea(screenPos: Vector2): boolean`**
    - 指定されたスクリーン座標が、マップ領域（セクター境界内）であるかを判定する。
    - **内部ロジック**:
        1. `this.toWorld(screenPos)` でワールド座標に変換。
        2. `GameDataRepository.getMasterConfig().boundaryRadius` を取得。
        3. 変換後の座標のワールド原点からの距離が、半径以内であれば `true` を返す。

- **`getWorldToScreenMatrix(): Matrix`**
    - 上記の変換（回転・平行移動・スケーリング）を統合した変換行列を返す。

- **`zoom(factor: number, anchor?: Vector2): void`**
    - 現在の倍率に対して `factor`（倍率係数）を乗算してズームを行う。
    - ズーム基点はワールド原点 `(0, 0)`、つまり母星中心とする。
    - 入力イベントから `anchor`（スクリーン座標）が渡されても、ズーム基点には使用しない。これはマップと背景の視覚的なズーム基点を比較しやすくするための仕様である。
    - ズーム前後で `toScreen({ x: 0, y: 0 })` が変化しないように `position` を自動調整する。
    - ズーム後の `zoomLevel` は 0.1 ～ 2.0 の範囲に制限する。

- **`rotate(anchor: Vector2, delta: Vector2): void`**
    - スクリーン座標上の `anchor`（開始点）と `delta`（移動量）を受け取り、ワールド原点 `(0, 0)` を中心とした回転角 `rotation` を更新する。
    - **内部ロジック**: `toScreen({ x: 0, y: 0 })` で算出した、スクリーン上に見えているワールド原点位置をピボットとして、入力ベクトルの角度変化量を計算・適用する。パン後も画面中央ではなく母星中心を基準に回転する。

- **`pan(screenDelta: Vector2): void`**
    - スクリーン上での移動量 `screenDelta`（ピクセル）を受け取り、現在の `zoom` を考慮して `position` を更新する。
    - `position` は回転後座標系で保持されるため、パン量をさらに `rotation` で逆回転してはならない。
