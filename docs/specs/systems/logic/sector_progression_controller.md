# Specification: SectorProgressionController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: セクター進行と契約終了判定の実行者。
- **責務**:
    - 施設退出後、次セクター開始に必要な session 更新、Sector 生成、HUD / Renderer 更新を実行する。
    - 航行結果確定後または施設退出時のゲームオーバー判定を実行し、契約終了時の記録・ランキング・実績・終了画面表示をまとめる。
    - GameController から呼び出され、画面入力や施設取引そのものは扱わない。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`constructor(infrastructure: object)`**
    - `sessionState`, `economySystem`, `gameRecordTracker`, `rankTracker`, `achievementTracker`, `uiController`, `worldRenderer`, `gameDataRepository` を保持する。
    - テスト用に `sectorFactory` を受け取れる。未指定時は `new Sector(sessionState, isAnomaly, gameDataRepository, economySystem)` を使用する。

- **`checkGameOverAndStartEndSequence(context: object): boolean`**
    - `EconomySystem.checkGameOver(sessionState)` を呼び出す。
    - 継続可能な場合は `false` を返す。
    - ゲームオーバーの場合:
        1. `SessionState.getGameResultSummary({ completedSectors })` で契約結果を取得する。
        2. `GameRecordTracker.recordGameResult(gameResult)` を呼び出す。
        3. 更新キーがある場合、`AchievementTracker.evaluateAchievements({ source: 'game_record', keys })` を呼び出す。
        4. `RankTracker.recordGameResult(gameResult)` を呼び出す。
        5. `UIController.showGameEndSequence(gameResult, gameOver, { achievements, ranks })` を呼び出す。
        6. `true` を返す。

- **`beginSectorTransition(options: object): Promise<Sector>`**
    - 次セクターを開始する。
    - **内部挙動**:
        1. `SessionState.incrementSector()` を呼び出す。
        2. `Sector` を生成する。`options.isAnomaly` が未指定の場合は `false` とする。
        3. `GameRecordTracker.recordSectorStart(sessionState)` を呼び出す。
        4. 更新キーがある場合、`AchievementTracker.evaluateAchievements({ source: 'game_record', keys })` を呼び出す。
        5. `WorldRenderer.setSector(sector)`、`UIController.updateHUDValue('sector', sectorNumber)`、`UIController.showBuildScreen()`、`UIController.setFlightMode(false)` を呼び出す。
        6. 生成した `Sector` を返す。

## 3. 備考

- ワープ演出の詳細、異常セクター判定、セクター切替タイミングの演出制御は今後の実装で拡張する。
- 本クラスは、セクター進行と契約終了処理が GameController に集中しすぎることを防ぐための分割である。
