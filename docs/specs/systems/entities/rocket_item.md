# Specification: RocketItem Class (Skeleton)

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Game Lifecycle
- **継承関係**: `Item` クラスを継承する。
- **役割**: プレイヤーがパーツから組み上げたインベントリアイテム。
- **責務**:
  - `ItemContainer` に格納できる基本性質の提供。
  - 内包するパーツ（Chassis, Logic, Modules, Booster）の構成情報の保持。
  - 構成パーツから算出される基本性能（総質量など）の集計・提供。

## 2. インターフェース (Interface)

*(シナリオ策定後に追記)*
