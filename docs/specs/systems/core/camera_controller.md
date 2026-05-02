# Specification: CameraController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: カメラ制御。
- **責務**:
    - ズーム、パン、および回転（原点中心）を含む視界管理。
    - ワールド絶対座標からスクリーン座標への変換ロジックの提供。
    - 追従対象（Rocket等）へのフォーカス制御。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`position: Vector2`**: カメラのパン位置。回転角に応じた相対座標として扱う。
- **`rotation: number`**: ワールド座標 (0, 0) を中心としたカメラの回転角（ラジアン）。
- **`zoom: number`**: 表示倍率。
- **`viewportSize: Vector2`**: 現在の表示領域（キャンバス）の幅と高さ。※実行時のみ保持し、永続化は行わない。

### メソッド (Methods)
- **`initialize(): void`**
    - `DataManager.getSavedCameraState(migrationMap)` を実行し、永続化されている設定値を自身に適用する。
    - `migrationMap` の `init` では、デフォルトのカメラ状態（position: {0,0}, rotation: 0, zoom: 1.0）を返す。
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
        2. `DataManager.getMasterConfig().boundaryRadius` を取得。
        3. 変換後の座標のワールド原点からの距離が、半径以内であれば `true` を返す。

- **`getWorldToScreenMatrix(): Matrix`**
    - 上記の変換（回転・平行移動・スケーリング）を統合した変換行列を返す。

- **`zoom(factor: number, anchor?: Vector2): void`**
    - 現在の倍率に対して `factor`（倍率係数）を乗算してズームを行う。
    - `anchor`（スクリーン座標）が指定された場合、その地点のワールド座標がズーム前後で変化しないように `position` を自動調整する。指定がない場合は画面中心を基準とする。

- **`rotate(anchor: Vector2, delta: Vector2): void`**
    - スクリーン座標上の `anchor`（開始点）と `delta`（移動量）を受け取り、ワールド原点 `(0, 0)` を中心とした回転角 `rotation` を更新する。
    - **内部ロジック**: スクリーン上に見えているワールド原点位置をピボットとして、入力ベクトルの角度変化量を計算・適用する。

- **`pan(screenDelta: Vector2): void`**
    - スクリーン上での移動量 `screenDelta`（ピクセル）を受け取り、現在の `rotation` と `zoom` を考慮して `position` を更新する。
