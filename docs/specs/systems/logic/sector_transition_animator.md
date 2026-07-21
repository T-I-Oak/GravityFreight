# Specification: SectorTransitionAnimator Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: セクター開始ワープ演出の時間制御。
- **責務**:
    - セクター切替時に、ワープアウト、セクター生成、ワープインの順序を保証する。
    - `WorldRenderer.startWarpEffect(duration)` と `WorldRenderer.stopWarpEffect(duration)` を呼び出す。
    - セクター生成そのものは受け取った callback に委譲し、`Sector` や記録更新の詳細を扱わない。

## 2. インターフェース (Interface)

### プロパティ (Properties)

- **`worldRenderer: WorldRenderer`**: ワープ演出の開始・終了を通知する描画システム。
- **`wait: function`**: ミリ秒指定で待機する関数。テスト時は即時解決する関数を注入できる。
- **`durations: object`**: ワープアウト、ホールド、ワープインの時間設定。

### メソッド (Methods)

- **`constructor(options: object)`**
    - `worldRenderer`, `wait`, `durations` を保持する。
    - `durations` 未指定時は β v1 と同じ合計 3.5 秒の比率を基準に、`warpOut: 1400`, `hold: 700`, `warpIn: 1400` を使用する。

- **`play(createSector: function): Promise<Sector>`**
    - セクター開始ワープを実行し、新しい `Sector` を返す。
    - **内部挙動**:
        1. `WorldRenderer.startWarpEffect(warpOut)` を呼び出し、既存マップをワープアウト表示にする。
        2. `warpOut` 経過後、`createSector()` を呼び出す。
        3. `hold` 経過後、`WorldRenderer.stopWarpEffect(warpIn)` を呼び出し、新マップをワープイン表示にする。
        4. `warpIn` 経過後、`createSector()` が返した `Sector` を返す。
    - `createSector` が未指定の場合は、状態遷移の不整合として例外を投げる。

## 3. 責務境界

- セクター番号更新、`Sector` 生成、記録・実績更新、HUD 更新は `SectorProgressionController.beginSectorTransition()` の責務とする。
- ビルド画面の表示再開は `GameController.beginSectorTransition()` の責務とする。
- 実際の Canvas 表現、マップ拡縮、背景星の光跡は `WorldRenderer` / `BackgroundManager` の責務とする。
- ワープ音の開始・停止は、背景演出と必ず同期する必要があるため `WorldRenderer.startWarpEffect()` / `WorldRenderer.stopWarpEffect()` の内部責務とする。本クラスは音響システムを直接扱わない。
