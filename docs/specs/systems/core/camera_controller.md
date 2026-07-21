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
    - `migrationMap` の `init` では、デフォルトのカメラ状態（position: {0,0}, rotation: 0, zoomLevel: 0.5）を返す。
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

- **`getState(): CameraState`**
    - 現在の `position`、`rotation`、`zoomLevel` をコピーして返す。
    - Tutorial などの一時的な camera focus で、復元用の状態として使用する。

- **`applyState(state: CameraState): void`**
    - 指定された camera state を適用する。
    - `position`、`rotation`、`zoomLevel` は有限値でなければならない。
    - `zoomLevel` は 0.1 ～ 2.0 の範囲に制限する。
    - 状態適用だけを行い、永続化は行わない。

- **`calculateFocusState(bounds, options?): CameraState`**
    - 指定されたワールド座標の矩形 `bounds` が、表示領域内に収まる camera state を算出する。
    - `options.padding` は viewport の上下左右に確保するスクリーン上の余白として扱う。
    - カメラが回転している場合は、`bounds` の4隅を現在の `rotation` で回転した後の外接矩形を使って必要な表示サイズを計算する。
    - これにより、回転中でも tutorial highlight などの対象が画面外にはみ出さないようにする。
    - 算出のみを行い、camera state の変更や永続化は行わない。

- **`focusWorldBounds(bounds, options?): CameraState`**
    - `calculateFocusState()` で算出した state を `applyState()` で適用し、その state を返す。
    - 一時表示用の操作であり、永続化は行わない。

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

- **`reset(options?: { persist?: boolean }): void`**
    - カメラ状態をデフォルト値へ戻す。
    - `position` は `{ x: 0, y: 0 }`、`rotation` は `0`、`zoomLevel` は `0.5` とする。
    - デフォルトではリセット後に `save()` を呼び、`GameDataRepository.setSavedCameraState()` 経由で永続化する。
    - `options.persist === false` の場合は永続化しない。リプレイ開始時など、一時表示だけを標準カメラに戻す用途で使用する。

- **`save(): void`**
    - 現在の `position`、`rotation`、`zoomLevel` を `GameDataRepository.setSavedCameraState()` 経由で永続化する。
