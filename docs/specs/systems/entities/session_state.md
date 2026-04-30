# Specification: SessionState Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Game Lifecycle
- **役割**: ゲームプレイ中の状態保持。
- **責務**:
    - 所持金（Coins）、累計スコア、現在のセクター番号、獲得ストーリーID、統計データの保持。
    - プレイヤー全体所持品（ItemContainer）の管理。

## 2. インターフェース (Interface)

- **`initialize(data: InitialSetupData): void`**
    - ゲーム開始時に呼び出され、初期所持金や初期装備を設定する。
    - セクター番号を 0 にリセットする。
