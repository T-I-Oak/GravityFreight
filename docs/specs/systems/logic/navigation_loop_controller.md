# Specification: NavigationLoopController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: 航行中の物理更新ループの実行者。
- **責務**:
    - `PhysicsEngine.step()` をフレームごとに呼び出し、航行中の Rocket / Sector 状態を更新する。
    - 物理更新結果を HUD / Renderer へ通知する。
    - `PhysicsEngine.step()` が返す終了判定を監視し、航行終了処理へ通知する。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`constructor(infrastructure: object)`**
    - `physicsEngine` を必須依存として受け取る。
    - `gameDataRepository`、`uiController`、`worldRenderer`、`requestFrame`、`cancelFrame` を受け取り、航行中の表示更新とフレーム制御に使用する。
    - `requestFrame` / `cancelFrame` は通常 `requestAnimationFrame` / `cancelAnimationFrame` を使用し、テスト時は差し替え可能とする。

- **`start(context: object): void`**
    - 航行更新ループを開始する。
    - `context.rocket`、`context.sector`、`context.onNavigationEnd` を必須とする。
    - 既にループ中の場合は現在のループを停止してから新しいループを開始する。
    - `onNavigationEnd` は `PhysicsEngine.step()` の `collision` を `GameController.handleNavigationEnd()` へ接続する callback として使用する。

- **`stop(): void`**
    - 進行中のフレーム予約を解除し、航行更新ループを停止する。
    - 航行終了時、セクター遷移開始時、または新しい航行開始時に呼び出す。

- **`step(): object | null`**
    - 航行中の場合のみ 1 tick 分の物理更新を行う。
    - **内部挙動**:
        1. `PhysicsEngine.step(rocket, sector)` を呼び出す。
        2. `stepResult.ticks` を `UIController.updateHUDValue('score', ticks)` へ通知する。
        3. `WorldRenderer.render()` を呼び出し、更新済み Rocket / Sector 状態を描画へ反映する。
        4. `stepResult.collision` が存在する場合、ループを停止し `onNavigationEnd(stepResult.collision)` を呼び出す。
    - ループ停止中に呼び出された場合は `null` を返す。

- **`advance(elapsedSeconds: number): number`**
    - フレーム間の経過時間を accumulator に加算し、`gameDataRepository.getMasterConfig().simulationTickSeconds` ごとに `step()` を実行する。
    - 1フレームで処理する物理 step 数は最大 10 とする。
    - 例: `simulationTickSeconds = 0.002`、`elapsedSeconds = 0.016` の場合は 8 step 実行する。
    - 戻り値は実行した step 数。

- **`isRunning(): boolean`**
    - 航行更新ループが進行中かどうかを返す。

## 3. 責務境界 (Boundaries)

- `NavigationLoopController` は航行結果の精算、リプレイ記録、画面遷移を行わない。
- 航行終了後の処理は `GameController.handleNavigationEnd()` が担当する。
- 衝突、出口、境界、回避モジュール、アイテム回収のルール判定は `PhysicsEngine` が担当する。
- Canvas 上の実際の描画内容は `WorldRenderer` が担当し、本クラスは再描画タイミングだけを通知する。
