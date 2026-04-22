# Gravity Freight V2: UI Reconstruction Backlog

本バックログは、新設された `design_philosophy.md` に基づき、UIシステムと各画面をゼロから再定義・再構築するためのものである。

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
- [x] **Phase 2: Trading Post (施設画面)**: V1 質感の復元と基盤統合
    - `ui-well`（くぼみ）コンポーネントの実装による重厚なパネル質感の再現。
    - `--current-color` によるテーマ色の透過的な色管理システムの確立。
    - ヘッダー（施設バッジ）、フッター（横並びクレジット、ナビゲーションテキスト）の標準化。
- [x] **Phase 2-2: Scene Refinement**:
    - **Flight Result**: 動的な配色（Entity/World Color Mix）とレイアウトの最適化。

## Phase 1: Foundation (基盤再構築)
- [x] **Design Tokens の再定義**: `design_tokens.css` を意味論に基づき清書完了。
- [x] **Base Capabilities の確立**: `ui_base.css` に共通の振る舞いを集約完了。
- [x] **Style Layer の構築**: 各ビジュアルスタイルを再定義
    - [x] **Matte Style Layer**: `ui_style_matte.css` (ウェル質感を共通化し完了)
    - [ ] **Printing Style Layer**: `ui_style_printing.css` (新規/再構築)

## Phase 2: Scene Reconstruction (各画面の再構築)
各画面を新しい4軸モデルとレイヤー構造で順次再定義する。
- [ ] **Story Modal (ストーリーモーダル)**: 再定義
- [ ] **Analytic Archive (記録画面)**: 
    *   モックアップの清書（HTML/CSS構造の最適化）
    *   機能仕様の確定
- [ ] **Terminal Report (ゲームリザルト)**: 再定義

## Phase 3: System Integration (システム統合)
- [ ] **全画面のレスポンシブ・スクロール点検**
- [ ] **実装フェーズへの移行**
