# Gravity Freight V2: UI Reconstruction Backlog

本バックログは、新設された `design_philosophy.md` に基づき、UIシステムと各画面をゼロから再定義・再構築するためのものである。
旧仕様および旧コードは `docs_old/` を参照すること。

## Phase 1: Foundation (基盤再構築)
- [ ] **Design Tokens の再定義**: `design_tokens.css` を意味論に基づき清書する
- [ ] **Base Capabilities の確立**: `ui_base.css` に共通の振る舞いを集約する
- [ ] **Matte Style Layer の再構築**: 4軸モデルに基づき `ui_style_matte.css` をゼロから書き直す

## Phase 2: Scene Reconstruction (各画面の再構築)
各画面を新しい4軸モデルとレイヤー構造で順次再定義する。
- [ ] **Analytic Archive (記録画面)**: 
    *   モックアップの清書（HTML/CSS構造の最適化）
    *   機能仕様の確定
- [ ] **Flight Result (航行結果画面)**: 再定義
- [ ] **Terminal Report (ゲームリザルト)**: 再定義
- [ ] **Trading Post (施設画面)**: 再定義

## Phase 3: System Integration (システム統合)
- [ ] Z-index 管理システムの導入
- [ ] 全画面のレスポンシブ・スクロール点検
- [ ] 実装フェーズへの移行
