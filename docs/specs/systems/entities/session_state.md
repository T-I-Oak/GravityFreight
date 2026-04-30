# Specification: SessionState Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Game Lifecycle
- **役割**: ゲームプレイ中の状態保持。
- **責務**:
    - 所持金（Coins）、累計スコア、現在のセクター番号、獲得ストーリーID、統計データの保持。
    - プレイヤー全体所持品（ItemContainer）の管理。

## 2. インターフェース (Interface)

- **`initialize(): void`**
    - ゲーム開始時の初期状態を構築する。
    - **挙動**:
        1. `DataManager.getInitialSetup()` を実行し、初期パラメータを取得する。
        2. 取得した所持金を自身の `coins` にセットする。
        3. セクター番号を `0` にセットする。
        4. 取得した初期装備IDリストをループし、各IDで `new Item(id)` を実行してインスタンスを生成、自身の `inventory`（ItemContainer）に `addItem()` で追加する。
