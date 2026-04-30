# Specification: Rocket Class (Skeleton)

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Game Lifecycle (インベントリに格納されている期間を含む)
- **継承関係**: `Item` クラスを継承する。
- **役割**: 複数のパーツ（アイテム）から組み上げられた「特殊なアイテム」であり、発射時にはプレイヤーが操作する物理実体として振る舞う。
- **責務**:
  - `Item` としての基本機能（`ItemContainer` に格納できる性質）。
  - 内包するパーツ（Chassis, Logic, Modules, Booster）の性能の集計。
  - 航行中における現在の物理状態（位置、速度、回転）の保持。
  - 予測軌道データ（Predicted Path）の保持。
  - 航行中の航跡（Actual Trail）および回収アイテム（Cargo）の保持。
  - ※具体的なプロパティ・メソッドは、シナリオ策定プロセスの中で必要になったものだけを後から追記する。

## 2. インターフェース (Interface)

*(シナリオ策定後に追記)*
