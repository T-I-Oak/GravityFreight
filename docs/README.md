# Gravity Freight V2 Development Documentation

Gravity Freight V2 の設計・開発に関する全ドキュメントのインデックスです。
すべての開発作業は、[V2 Core Philosophy](./V2_CORE_PHILOSOPHY.md) に基づいて行われます。

## 核心ドキュメント
- **[V2 Core Philosophy](./V2_CORE_PHILOSOPHY.md)**: 開発の三大原則（共通化・階層化・意味論）
- **[Coding Principles](./guidelines/coding_principles.md)**: コーディングの7つの原理とチェックリスト
- **[File Management](./guidelines/file_management.md)**: ファイル命名規則と運用ルール
- **[Process Rules](./guidelines/local_process_rules.md)**: AIの行動規範と開発手順
- **[Update History Standard](./guidelines/update_history_standard.md)**: 更新履歴の記述基準 (V1 準拠)
- **[Update History Specification](./specs/common/update_history.md)**: プレイヤー向け更新履歴 (JSON) 仕様
- **[UI Design Philosophy](./specs/ui/design_philosophy.md)**: 4軸モデルとレイヤー構造に基づくUI設計指針
- **[UI Component Standard](./specs/ui/component_standard.md)**: セマンティックHTMLとコンポーネント定義

## 計画・進捗
- **[Development Backlog](./planning/backlog.md)**: 現在の再構築ロードマップ

## 要件・データ仕様
- **[Core Mechanics](./requirements/core_mechanics.md)**: ゲームの基本システム要件
- **[Item Catalog](./requirements/item_catalog.md)**: アイテム定義とプロパティ
- **[World Config](./requirements/world_config.md)**: セクター・施設の設定データ

## クラス仕様 (Class Specifications)
- **[Class Roles](./specs/systems/class_roles.md)**: 全体構造、ライフサイクル、ドメイン別クラス役割定義への入口

### Core Systems
- **[App Orchestrator](./specs/systems/core/app_orchestrator.md)**: アプリ全体管理
- **[Game Data Repository](./specs/systems/core/game_data_repository.md)**: マスタデータ参照とユーザーデータ保存の統合窓口
- **[UI Controller](./specs/systems/core/ui_controller.md)**: 画面遷移・HUD制御
- **[App Metadata View](./specs/systems/core/app_metadata_view.md)**: バージョン・コピーライト表示
- **[Archive Dialog View](./specs/systems/core/archive_dialog_view.md)**: 記録画面 overlay 表示
- **[How To Play UI](./specs/systems/core/how_to_play_ui.md)**: 説明書画面制御
- **[How To Play Diagrams](./specs/systems/core/how_to_play_diagrams.md)**: 説明書内デモ描画
- **[Sound Controller](./specs/systems/core/sound_controller.md)**: 音響演出管理
- **[World Renderer](./specs/systems/core/world_renderer.md)**: 描画エンジン
- **[Camera Controller](./specs/systems/core/camera_controller.md)**: 視界管理
- **[Background Manager](./specs/systems/core/background_manager.md)**: 遠景演出
- **[Title Screen Animator](./specs/systems/core/title_screen_animator.md)**: タイトル画面演出

### World & Entities
- **[Sector](./specs/systems/world/sector.md)**: 環境コンテナ
- **[Celestial Body](./specs/systems/world/celestial_body.md)**: 天体・重力源
- **[Exit Arc](./specs/systems/world/exit_arc.md)**: 目的地・ゴール
- **[Rocket](./specs/systems/entities/rocket.md)**: プレイヤー機体（物理実体）
- **[Rocket Item](./specs/systems/entities/rocket_item.md)**: 機体構成パーツデータ
- **[Item Base](./specs/systems/entities/item.md)**: アイテム基底クラス
- **[Stacked Item](./specs/systems/entities/stacked_item.md)**: スタック可能なアイテム
- **[Module Stack](./specs/systems/entities/module_stack.md)**: 同種モジュールの統合管理
- **[Item Container](./specs/systems/entities/item_container.md)**: 汎用アイテムコンテナ
- **[Session State](./specs/systems/entities/session_state.md)**: 航行中の動的ステータス

### Logic Systems
- **[Economy System](./specs/systems/logic/economy_system.md)**: 経済・報酬計算
- **[Achievement Tracker](./specs/systems/logic/achievement_tracker.md)**: 実績管理
- **[Rank Tracker](./specs/systems/logic/rank_tracker.md)**: ランキング管理
- **[Flight Recorder](./specs/systems/logic/flight_recorder.md)**: 航行記録・再現
- **[Archive Screen Presenter](./specs/systems/logic/archive_screen_presenter.md)**: 記録画面表示データ生成
- **[Game Controller](./specs/systems/logic/game_controller.md)**: ゲーム進行の統括
- **[Build Flow Controller](./specs/systems/logic/build_flow_controller.md)**: ビルド画面の選択状態と再描画
- **[Physics Engine](./specs/systems/logic/physics_engine.md)**: 物理計算エンジン
- **[Story System](./specs/systems/logic/story_system.md)**: フラグ・既読管理
- **[Trajectory Predictor](./specs/systems/logic/trajectory_predictor.md)**: 軌道予測ロジック

## UI仕様 (UI Specifications)
- **[Navigation HUD](./specs/ui/navigation_hud.md)**: 航行画面HUDの表示仕様
- **[Analytic Archive](./specs/ui/analytic_archive.md)**: 記録・実績画面のレイアウト

## 旧資産 (Reference)
- **[Old Documents Index](../docs_old/README.md)**: アーカイブされた旧仕様・記録

---
*Note: このドキュメント群は、Gravity Freight V2 の再構築プロジェクトにおいて「唯一の真実」として機能します。*
