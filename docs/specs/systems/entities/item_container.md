# Specification: ItemContainer Class (Skeleton)

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Exist Lifecycle
- **役割**: 汎用的なアイテムコンテナ。
- **責務**:
  - `StackedItem` のコレクションを保持・管理する。
  - アイテムの追加（同一アイテムのスタック統合を含む）、削除、移動ロジックの共通化。
  - `SessionState`（プレイヤー所持品）、`RocketItem`（モジュール構成）、`Rocket`（航行中の一時的な回収アイテム）、`CelestialBody`（星の保持アイテム）など、あらゆる場所で再利用される。

## 2. インターフェース (Interface)

*(シナリオ策定後に追記)*
