# Specification: SessionState Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Game Lifecycle
- **役割**: ゲームプレイ中の状態保持。
- **責務**:
    - 所持金（Coins）、累計スコア、現在のセクター番号、獲得ストーリーID、統計データの保持。
    - プレイヤー全体所持品（ItemContainer）の管理。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`sectorNumber: number`**: 現在のセクター番号（初期値 0）。
- **`totalScore: number`**: 現在の累計スコア。
- **`coins: number`**: 現在の所持金。
- **`inventory: ItemContainer`**: プレイヤーのグローバルインベントリ（未装備アイテム等）。
- **`blackMarketVisits: number`**: 闇市場（BLACK MARKET）への到達累計回数。

### メソッド (Methods)

- **`initialize(): void`**
    - ゲーム開始時の初期状態を構築する。
    - **挙動**:
        1. `DataManager.getMasterInitialSetup()` を参照し、初期パラメータを取得。
        2. 取得した所持金を自身の `coins` にセット。
        3. セクター番号を `0` にセット。
        4. 闇市場訪問回数を `0` にセット。
        5. 初期装備アイテムのインスタンスを生成し、`inventory` に追加。

- **`incrementSector(): void`**
    - セクター番号を 1 インクリメントする。

- **`recordBlackMarketVisit(): void`**
    - 闇市場訪問回数を 1 インクリメントする。

- **`applySettlement(result: SettlementResult): void`**
    - 航行結果（報酬・アイテム増減）を現在の状態に適用する。
    - **内部挙動**:
        1. **金銭・スコア**: `coins += result.totalCoins`, `totalScore += result.totalScore` を実行。
        2. **新規アイテム追加**: `result.acquiredItems` の各アイテムを `inventory` へ追加。
        3. **天体へのアイテム移動**: `result.lostToTarget` が存在する場合、対象の天体（母星またはクラッシュ先）にアイテムを移動する（`result.lostToTarget.target.addItems(result.lostToTarget.items)`）。
