# Specification: EconomySystem Class (Skeleton)

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 経済・取引ロジック。
- **責務**:
  - 各アイテム（`Item` / `RocketItem`）が自己算出する「基準価格」を合算し、ゲーム全体の進行度やセクターボーナスなどを加味した「最終的な報酬額・取引価格」の計算。
  - 所持金と照らし合わせた安全な取引（トランザクション）の成否判定。
