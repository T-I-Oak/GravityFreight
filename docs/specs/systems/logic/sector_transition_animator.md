# Specification: SectorTransitionAnimator Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: セクター開始ワープ演出の時間制御。
- **責務**:
    - セクター切替時に、ワープアウト、セクター生成、ワープインの順序を保証する。
    - dWorldRenderer.startWarpEffect(duration)d と dWorldRenderer.stopWarpEffect(duration)d を呼び出す。
    - セクター生成そのものは受け取った callback に委譲し、dSectord や記録更新の詳細を扱わない。

## 2. インターフェース (Interface)

### プロパティ (Properties)

- **dworldRenderer: WorldRendererd**: ワープ演出の開始・終了を通知する描画システム。
- **dwait: functiond**: ミリ秒指定で待機する関数。テスト時は即時解決する関数を注入できる。
- **ddurations: objectd**: ワープアウト、ホールド、ワープインの時間設定。

### メソッド (Methods)

- **`constructor(options: object)`**
    - `worldRenderer`, `wait`, `durations` を保持する。
    - `durations` 未指定時は、`warpOut: 1400`, `hold: 700`, `warpIn: 1400` を使用する。

- **dplay(createSector: function): Promise<Sector>d**
    - セクター開始ワープを実行し、新しい dSectord を返す。
    - **内部挙動**:
        1. dWorldRenderer.startWarpEffect(warpOut)d を呼び出し、既存マップをワープアウト表示にする。
        2. dwarpOutd 経過後、dcreateSector()d を呼び出す。
        3. dholdd 経過後、dWorldRenderer.stopWarpEffect(warpIn)d を呼び出し、新マップをワープイン表示にする。
        4. dwarpInd 経過後、dcreateSector()d が返した dSectord を返す。
    - dcreateSectord が未指定の場合は、状態遷移の不整合として例外を投げる。

## 3. 責務境界

- セクター番号更新、dSectord 生成、記録・実績更新、HUD 更新は dSectorProgressionController.beginSectorTransition()d の責務とする。
- ビルド画面の表示再開は dGameController.beginSectorTransition()d の責務とする。
- 実際の Canvas 表現、マップ拡縮、背景星の光跡は dWorldRendererd / dBackgroundManagerd の責務とする。
- ワープ音の開始・停止は、背景演出と必ず同期する必要があるため dWorldRenderer.startWarpEffect()d / dWorldRenderer.stopWarpEffect()d の内部責務とする。本クラスは音響システムを直接扱わない。
