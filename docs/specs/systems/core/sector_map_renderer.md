# Specification: SectorMapRenderer Class

## 1. 役割と責務

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: セクター内マップ要素描画。
- **責務**:
    - `WorldRenderer` から渡された Canvas 2D context、座標変換、色定義を使用して、セクター境界、exit arc、施設ラベル、配送 cargo アイコン、天体、アイテムリングを描画する。
    - `CameraController` や `CanvasColorPalette` を直接参照せず、描画に必要な投影済み transform と token 解決済み colors のみを使用する。
    - 航行中ロケットの描画、航跡、予測線、ソナーは担当しない。それらは `FlightVisualRenderer` の責務とする。

## 2. インターフェース

- **`render(context, sector, transform, colors, options): void`**
    - `sector` が存在しない場合は何も描画しない。
    - `transform` は `WorldRenderer` が生成する `toScreen(point)`, `radius(value)`, `scale`, `rotation` を持つ座標変換オブジェクト。
    - `colors` は `CanvasColorPalette.createWorldColors()` で解決済みの色定義。
    - `options.timestamp` は配送 cargo アイコンの点滅位相に使用する。
    - `options.activeRocket` は AIM 中または航行中のロケットであり、exit arc プレビュー倍率と回収済み配送 cargo 表示判定に使用する。

## 3. 描画対象

- **セクター境界**:
    - 最初の exit arc の半径を境界半径として、細い円を描画する。
- **exit arc**:
    - 施設種別ごとの色で太い発光 arc を描画する。
    - `activeRocket.getArcMultiplier()` が存在する場合、arc 幅へ倍率を反映する。
- **施設ラベル**:
    - 施設名を exit arc 外側の円周上に文字単位で配置する。
    - 下半分では天地補正を行い、常に読みやすい向きにする。
- **配送 cargo アイコン**:
    - セクター内、または航行中ロケットの `heldCargo` に該当施設向け配送 cargo がある場合に表示する。
    - 形状は `deliveryCargoIconShape` の共通定義を参照する。
    - 施設色で描画し、ゆっくり明滅する。
- **天体とアイテムリング**:
    - 母星、通常星、斥力星の色を使い分ける。
    - 天体上のアイテムカテゴリに応じて、外周リングをカテゴリ色で描画する。

## 4. 例外

- `activeRocket` が存在し、`getArcMultiplier()` を提供しない場合は仕様不整合として例外を投げる。
- `getArcMultiplier()` が正の有限数を返さない場合も仕様不整合として例外を投げる。
