# Specification: FlightVisualRenderer Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 航行中および AIM 中のロケット周辺ビジュアルを Canvas 2D 描画命令へ変換する。
- **責務**:
    - `WorldRenderer` から渡された Canvas 2D context、座標変換、描画状態を使用して、予測線、航跡、貨物、ロケット本体、ソナーを描画する。
    - ワールド座標系（単位: world px）の点列を `CameraController` 由来の変換でスクリーン座標へ投影する。
    - `Rocket` の状態を読み取り専用で参照し、航跡や保持アイテムを更新しない。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`render(context, transform, view, state, colors): void`**
    - 航行中ビジュアルの描画をまとめて実行する。
    - **引数**:
        - `context`: Canvas 2D context。
        - `transform`: `WorldRenderer` が生成した座標変換オブジェクト。
        - `view`: `WorldRenderer` が生成した表示状態。ソナー位相計算に `timestamp` を使用する。
        - `state.navigationRocket`: 航行中、または AIM 中に表示する `Rocket | null`。
        - `state.predictionPath`: AIM 中の予測軌道座標列。
        - `state.hideRocketBody`: ロケット本体だけを非表示にするかどうか。航行終了演出中に使用する。
        - `state.sonarEnabled`: ソナー表示状態。
        - `state.sonarStopTimestamp`: ソナー新規生成を停止した時刻。既存波紋の自然消滅判定に使用する。
        - `colors`: `CanvasColorPalette` から解決済みの描画色定義。`FlightVisualRenderer` は色値を保持しない。
    - **描画順**:
        1. 予測軌道
        2. 実航跡
        3. 保持アイテム
        4. ロケット本体
        5. ソナー波紋

## 3. 描画仕様 (Rendering)

### 3.1 予測軌道

- `predictionPath` が 2 点以上ある場合に、点列をスクリーン座標へ変換して連続線で描画する。
- 予測軌道は AIM 中の確認用途であり、ロケット本体や貨物は描画しない。
- AIM 可能状態で予測シミュレーション結果が空になる場合は、`GameController` 側の不整合として扱う。`FlightVisualRenderer` は受け取った点列だけを描画し、代替線は生成しない。

### 3.2 実航跡

- `navigationRocket.actualTrail` が 2 点以上ある場合に、点列をスクリーン座標へ変換して描画する。
- 航跡は隣接点ごとのセグメントとして描画し、古いセグメントほど透明、新しいセグメントほど不透明にしてフェードアウト表現を行う。
- 実航行中の点列は `Rocket` 側で最大長に丸められるため、航跡は一定長だけ残り、古い軌跡は描画対象から外れる。
- AIM 中のプレビュー用 Rocket は通常 `actualTrail` を持たないため、航跡は描画せず、予測軌道・ロケット本体・ソナーを描画する。
- 航跡データの追加は `Rocket.updateState()` の責務であり、`FlightVisualRenderer` は既存点列を描画するだけとする。

### 3.3 保持アイテム

- `navigationRocket.heldCargo` の各 item を、ロケット直後の航跡上へ順に配置する。
- 配置は item ごとに航跡 index を 8 点ずつ後方へずらし、回収アイテムがロケットの軌跡を追うように見せる。
- 航跡が 5 点未満の場合、追従位置が安定しないため保持アイテムは描画しない。
- item のカテゴリは `item.category` または `item.getViewData().category` から取得し、カテゴリ色で小円として描画する。
- 保持アイテムの追加・削除・置送判定は描画クラスの責務ではない。

### 3.4 ロケット本体

- ロケット本体は `navigationRocket.position` を中心に三角形状で描画する。
- `state.hideRocketBody === true` の場合は、ロケット本体だけを描画しない。航跡、保持アイテム、ソナーは通常通り描画対象とする。
- 向きは速度ベクトルを優先し、速度がほぼ 0 の場合は `navigationRocket.angle` を使用する。
- カメラ回転中も画面上の向きがマップと同期するよう、描画角度には `transform.rotation` を加算する。
- `navigationRocket.position` は物理上の発射位置・現在位置として扱い、航跡、ソナー、判定、およびロケット図形中心の基準点として維持する。母星からの初期距離は `GameController` が `home.radius + gameBalance.SHIP_START_OFFSET` world px として決定する。

### 3.5 ソナー波紋

- `sonarEnabled` が true、または `sonarStopTimestamp` が設定されている場合で、かつ `navigationRocket.getCollectionRange()` が 0 より大きい場合に描画する。
- 0.5 の位相差を持つ 2 つの同心円で、回収範囲まで広がる波紋を表示する。
- `sonarEnabled` が false かつ `sonarStopTimestamp` が設定されている場合は、停止時点で発生済みの波紋だけを描画し、周期が一周して新規発生扱いになる波紋は描画しない。
- ソナーは描画演出であり、アイテム回収判定そのものは `PhysicsEngine` 側の責務とする。
