# Specification: CanvasColorPalette Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: Canvas 描画で使用する色を CSS custom property から解決する。
- **責務**:
    - `css/design_tokens.css` の `--color-*` token を Canvas 2D API で使用できる文字列へ変換する。
    - `WorldRenderer`, `FlightVisualRenderer`, `BackgroundManager` が色値を直接保持しないようにする。
    - 必須 token が未定義の場合は例外を投げ、描画色のズレを隠蔽しない。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`get(name: string): string`**
    - 名前付き token を CSS custom property から解決する。
    - 例: `worldBg` は `--color-world-bg` を参照する。

- **`createWorldColors(): object`**
    - マップ、天体、施設、カテゴリ、航行ビジュアルで使う色定義をまとめて返す。
    - カテゴリ色は `--color-category-*`、施設色は `--color-facility-*` を参照する。

- **`createStarParticleColor(alpha: number): string`**
    - `--color-world-star-particle-rgb` と指定 alpha から `rgba(...)` を生成する。
    - 星粒子は透明度がフレームごとに変化するため、RGB 成分を token として管理する。

## 3. 制約 (Constraints)

- Canvas 描画クラスは `#ffffff` などの固定色を直接持たない。
- CSS 側の色調整が Canvas 描画へ反映されるよう、描画時に token を解決する。
- fallback 色で描画を継続してはならない。token 未定義は設定不備として扱う。
