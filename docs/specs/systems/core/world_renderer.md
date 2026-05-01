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

### プロパティ (Properties)
- **`targetSector: Sector | null`**: 現在描画対象となっているセクターインスタンスへの参照。
- **`warpScale: number`**: 演出用の追加倍率（初期値 1.0）。描画時に `camera.zoom` に乗算される。
- **`warpAlpha: number`**: 演出用の不透明度（初期値 1.0）。セクター内の全オブジェクトに適用される。

### メソッド (Methods)
- **`render(): void`**
    - メインの描画ループ。
    1. `BackgroundManager.render()` を呼び出し、背景を描画する。
    2. `targetSector` が存在する場合、その中の全オブジェクトを `CameraController.getWorldToScreenMatrix()` を用いてスクリーン上に描画する。

- **`setSector(sector: Sector | null): void`**
    - 描画対象とするセクターを差し替える。

- **`animateWarpEffect(fromScale: number, fromAlpha: number, toScale: number, toAlpha: number, duration: number): void`**
    - 始点（from）と終点（to）のパラメータを指定して、指定された時間をかけて変化させる汎用演出関数。
    - 各セマンティックなメソッド（WarpIn/Out等）の内部実装として使用される。

- **`animateWarpOut(duration: number): void`**
    - 現在のセクターから離脱し、ワープ空間へ突入する際の演出を実行する。
    - マップ全体がプレイヤーを追い越すように巨大化しながら透明度を下げ、視覚的に「消失」させる。
    - （内部実装: `animateWarpEffect(1.0, 1.0, 20.0, 0.0, duration)`）

- **`animateWarpIn(duration: number): void`**
    - ワープを終了し、新しいセクターの入り口に到達した際の演出を実行する。
    - 新しいマップが遠方の極小点から急接近してくるようなスケーリングを行い、期待感を醸成する。
    - （内部実装: `animateWarpEffect(0.05, 1.0, 1.0, 1.0, duration)`）

- **`handleResize(width: number, height: number): void`**
    - ブラウザのウィンドウリサイズ等に同期して呼び出され、PIXI.js のレンダラーサイズを更新する。
    - 併せて `CameraController.handleResize()` および `BackgroundManager.handleResize()` を呼び出し、各コンポーネントにサイズ変更を通知する。
