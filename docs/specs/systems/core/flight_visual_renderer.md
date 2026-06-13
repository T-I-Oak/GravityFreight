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
        - `state.sonarEnabled`: ソナー表示状態。
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

- `navigationRocket.actualTrail` が 2 点以上ある場合に、点列をスクリーン座標へ変換して連続線で描画する。
- AIM 中のプレビュー用 Rocket は通常 `actualTrail` を持たないため、航跡は描画せず、予測軌道・ロケット本体・ソナーを描画する。
- 航跡データの追加は `Rocket.updateState()` の責務であり、`FlightVisualRenderer` は既存点列を描画するだけとする。

### 3.3 保持アイテム

- `navigationRocket.heldCargo` の各 item を、ロケット直後の航跡上へ順に配置する。
- item のカテゴリは `item.category` または `item.getViewData().category` から取得し、カテゴリ色で小円として描画する。
- 保持アイテムの追加・削除・配送判定は描画クラスの責務ではない。

### 3.4 ロケット本体

- ロケット本体は `navigationRocket.position` を中心に三角形状で描画する。
- 向きは速度ベクトルを優先し、速度がほぼ 0 の場合は `navigationRocket.angle` を使用する。
- カメラ回転中も画面上の向きがマップと同期するよう、描画角度には `transform.rotation` を加算する。
- `navigationRocket.position` は物理上の発射位置・現在位置として扱い、ロケット図形の中心として描画する。母星からの初期距離は `GameController` が `SHIP_START_OFFSET` を含めて決定する。

### 3.5 ソナー波紋

- `sonarEnabled` が true かつ `navigationRocket.getCollectionRange()` が 0 より大きい場合に描画する。
- 0.5 の位相差を持つ 2 つの同心円で、回収範囲まで広がる波紋を表示する。
- ソナーは描画演出であり、アイテム回収判定そのものは `PhysicsEngine` 側の責務とする。
