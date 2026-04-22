# Gravity Freight V2: Backlog Archive

## Version 1.8.0 (2026/04/22) - 施設画面の V2 統合と配色標準化
- **Repair Dock (リペアドック)**: V2 アーキテクチャ（3層レイヤー、UIComponents）への移行完了。
- **Black Market (ブラックマーケット)**: V2 アーキテクチャへの移行完了。
- **配色ルールの統一**: 「支払い（支出）＝施設テーマ色」「受け取り（収入）＝サブテーマ色（金）」の色彩設計を全施設画面に適用。
- **コンポーネント標準の拡張**: 施設サービス用のカード生成パターン（category: black-market 等）を仕様化。

## Version 1.7.1 (2026/04/22) - 基盤コンポーネントの標準化
- **Phase 1: Foundation (基盤再構築)**: アイテムカードの標準化とレイヤー分離（Base/Style/Context）。
- **Phase 1-2: Style Layer (Neon)**: `ui_style_neon.css` の再構築完了。
- **Phase 2: Play Screen (プレイ画面) - テーマ再構築**: HUD、Inventory Panel、Item Cards の V2 統合。
- **Phase 1-3: UI Components Standard**: アイテムカード・プレースホルダーの標準化と `UIComponents.js` 実装。
- **Phase 2: Trading Post (施設画面)**: `ui-well`（くぼみ）導入とテーマ色管理システムの確立。
- **Phase 2-2: Scene Refinement**: Flight Result の配色・レイアウト最適化。
- **Design Tokens / Base Capabilities**: `design_tokens.css` および `ui_base.css` の意味論に基づく再定義完了。
- **Matte Style Layer**: `ui_style_matte.css` の再定義と質感の共通化完了。
