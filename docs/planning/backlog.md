# Gravity Freight V2: UI Reconstruction Backlog

本バックログは、新設された `design_philosophy.md` にに基づき、UIシステムと各画面をゼロから再定義・再構築するためのものである。

## Completed (完了)
- [x] **Phase 1: Foundation (基盤再構築)**: アイテムカードの標準化とレイヤー分離
    - 3層レイヤー設計（Base/Style/Context）をアイテムカードに厳密適用。
    - `background-image` と `color-mix` によるテーマ別の動的配色システムの構築。
    - `is-mini` コンポーネント（ゲージ・バッジ）による高密度表示への対応。
- [x] **Phase 1-2: Style Layer (Neon)**: `ui_style_neon.css` の再構築完了
    - 透過背景と発光エフェクトの最適化。
- [x] **Phase 2: Play Screen (プレイ画面) - テーマ再構築**
    - **HUD**: ロゴ、統計値、メールアイコン（活性/非活性）の質感と配置の最適化。
    - **Inventory Panel**: パネル構造（`.ui-panel`）の導入、セクションの整理。
    - **Item Cards**: 新標準カード（`.ui-item-card`）による全カテゴリーの動的描画化。
- [x] **Phase 1-3: UI Components Standard**:
    - アイテムカード・プレースホルダーの発明と標準化。
    - `UIComponents.js` への動的生成ジェネレーター実装。
- [x] **Phase 2: Facility Screens (施設画面) - V2 統合**
    - **Trading Post (交易所)**: `ui-well`（くぼみ）導入と配色テーマ確立。
    - **Repair Dock (リペアドック)**: V2 標準処理（UIComponents）への移行完了。
    - **Black Market (ブラックマーケット)**: V2 標準処理への移行完了。
    - **配色ルールの統一**: 「支払い＝施設色」「受け取り＝金（サブ色）」のルールを全施設に適用。
- [x] **Phase 2-2: Scene Refinement**:
    - **Flight Result**: 動的な配色（Entity/World Color Mix）とレイアウトの最適化。
- [x] **Design Tokens の再定義**: `design_tokens.css` を意味論に基づき清書完了。
- [x] **Base Capabilities の確立**: `ui_base.css` に共通の振る舞いを集約完了。
- [x] **Matte Style Layer**: `ui_style_matte.css` の再定義と質感の共通化完了。
- [x] **Story Modal (ストーリーモーダル)**: 
    - 施設色（`--current-color`）を透過合成する専用パネル（`.is-story`）の実装。
    - `UIComponents.js` への動的生成メソッドの実装と Fail Fast 設計の導入。
    - 装飾フォント（`UnifrakturMaguntia`）のトークン化による一元管理。

## Phase 1: Foundation (基盤再構築)
- [ ] **Printing Style Layer**: `ui_style_printing.css` (新規/再構築)

## Phase 2: Scene Reconstruction (各画面の再構築)
各画面を新しい4軸モデルとレイヤー構造で順次再定義する。
- [x] 記録画面（Analytic Archive）のモックアップ作成
- [x] スクロールバー仕様の標準化と .is-scrollable への一本化
    *   機能仕様の確定
- [ ] **Terminal Report (ゲームリザルト)**: 再定義

## Phase 3: System Integration (システム統合)
- [ ] **全画面のレスポンシブ・スクロール点検**
- [ ] **実装フェーズへの移行**
