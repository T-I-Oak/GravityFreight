# Specification: HowToPlayDiagrams Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 説明書内デモ描画。
- **責務**:
    - How To Play 画面内のカード選択デモと canvas アニメーションを管理する。
    - ページ単位で開始・停止できる短いループ演出を提供する。
    - β v2 の描画、物理、軌道予測の責務境界に合わせて説明用デモを構築する。
    - デモ停止時に timer / animation frame / canvas 状態を確実に整理する。

## 2. 責務境界

- `HowToPlayDiagrams` は説明書専用の補助演出であり、実プレイ中の航行状態を変更しない。
- 実ゲームの `SessionState`, `Rocket`, `Sector` などを直接変更しない。
- 実プレイの進行、報酬、記録、実績、永続データへ影響を与えない。
- DOM 全体のページ遷移やボタン制御は `HowToPlayUI` が担当する。
- canvas 内の描画、演出用タイマー、演出用サンプル状態は `HowToPlayDiagrams` が担当する。

## 3. インターフェース (Interface)

### `constructor(dependencies: object)`

以下の依存を受け取る。

- `gameDataRepository: GameDataRepository`: デモに必要なアイテム、施設名、カラー、定数の取得窓口。
- `uiComponents: UIComponents`: デモ用カード HTML の生成窓口。
- `worldRendererFactory?: Function`: canvas デモで β v2 の描画責務を再利用するための生成関数または描画アダプター。
- `physicsEngine?: PhysicsEngine`: NAVIGATION デモで簡易シミュレーションを行う場合の物理計算窓口。
- `trajectoryPredictor?: TrajectoryPredictor`: LAUNCH デモで予測軌道を表示する場合の計算窓口。

### `startAssembleDemo(container: HTMLElement): void`

- ASSEMBLE ページ内で、カード選択と建造ボタンの疑似操作をループ表示する。
- 操作対象は引数 `container` の内側だけに限定する。
- 選択状態や強調表示は CSS class の付け外しで表現する。
- 実際のインベントリ、ロケット建造処理、保存データは変更しない。

### `startLaunchDemo(canvas: HTMLCanvasElement, context: object): void`

- LAUNCH ページ内で、発射構成、発射角度、予測軌道の関係を短いループで表示する。
- `context` には説明用のロケット、発射台、ブースター、母星、セクター境界などのサンプル状態を渡す。
- 予測軌道の計算が必要な場合は `TrajectoryPredictor` または同等の β v2 互換アダプターを使用する。
- 描画は `WorldRenderer` の責務境界に合わせ、ロケット、天体、境界線、予測軌道を個別の描画要素として扱う。

### `startNavigationDemo(canvas: HTMLCanvasElement, context: object): void`

- NAVIGATION ページ内で、重力航行、航跡、出口到達の関係を短いループで表示する。
- 物理更新が必要な場合は `PhysicsEngine.step()` または同等の β v2 互換アダプターを使用する。
- セクター外縁は指定サイズの境界として扱い、出口アークはその縁上の角度範囲として描画する。
- 出口到達の説明は、領域外へ出た時点で出口アークの角度内かどうかを見る β v2 の判定モデルに合わせる。

### `stopAll(): void`

- すべての `setInterval`, `setTimeout`, `requestAnimationFrame` を停止する。
- 実行中デモの参照を破棄する。
- canvas の描画状態を必要に応じて初期化する。
- 何度呼び出しても安全な冪等処理とする。

### `handleResize(): void`

- 表示中の canvas サイズを現在の CSS 表示サイズに同期する。
- リサイズ後、表示中デモの座標系を再計算する。

## 4. デモ別仕様

### 4.1 ASSEMBLE

- β v1 の「カード選択と建造ボタンの疑似操作」を移植する。
- 表示するカード内容は `GameDataRepository` と `UIComponents` を経由して取得・生成する。
- デモは次の状態を順に示す。
    1. シャーシ、ロジック、モジュールの候補カードを表示する。
    2. カード選択状態を強調する。
    3. 建造ボタンの有効状態またはホバー状態を強調する。
    4. 初期状態へ戻る。

### 4.2 LAUNCH

- β v1 の「発射角度調整と予測線のデモ」の目的を維持する。
- canvas 内容は β v2 の責務境界に合わせて再設計する。
- 表示要素は、母星、選択ロケット、選択発射台、選択ブースター、発射角度、予測軌道を基本とする。
- 予測軌道は説明用サンプル状態から計算または生成し、実ゲーム状態を変更しない。
- 発射ボタンの疑似強調は DOM 側の class 操作で行い、発射処理は呼び出さない。

### 4.3 NAVIGATION

- β v1 の「重力航行の物理シミュレーション」の目的を維持する。
- canvas 内容は β v2 の `PhysicsEngine`, `Rocket`, `CelestialBody`, `ExitArc`, `WorldRenderer` の責務に合わせる。
- 表示要素は、ロケット、重力源、航跡、セクター境界、出口アークを基本とする。
- 航行ループは説明用サンプル状態の範囲で完結させ、実セクターや実ロケットを変更しない。
- 出口アークはセクター境界上の円弧として表示し、領域外へ出た位置の角度が円弧内かを示す。

## 5. ライフサイクル管理

- `HowToPlayUI` がページ移動、画面非表示、言語再描画を行う前に `stopAll()` を呼び出す。
- `HowToPlayDiagrams` 自身も新しいデモ開始前に `stopAll()` を呼び出し、古い演出を残さない。
- 画面が非表示の場合、新しい animation frame を予約しない。
- canvas 要素が DOM から外れている場合は、描画せず安全に停止する。

## 6. CSS class 方針

- 状態表現は `how-to-play-*` または説明書専用スコープ配下の class を使う。
- 将来のゲーム中 tutorial 用 `tutorial-*` class と衝突しない命名にする。
- アニメーション状態は、選択、強調、非アクティブ、遷移中などの意味単位で class を分ける。

## 7. 禁止事項

- `localStorage` へ直接アクセスしない。
- 共通 i18n の内部構造へ直接依存しない。
- 実ゲームの進行メソッド、保存メソッド、記録・実績更新メソッドを呼び出さない。
- β v1 の canvas 実装をそのままコピーしない。
- 説明書のために新しいゲームルールや未承認の挙動を追加しない。
