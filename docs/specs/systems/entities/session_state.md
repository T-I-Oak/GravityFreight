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
- **`sectorNumber: number`**: 現在到達しているセクター番号（初期値 0）。ワープ演出は前セクターのマップ表示から始まり、演出途中で次セクターを生成・表示へ切り替える。その次セクター生成時に 1 インクリメントする。
- **`totalScore: number`**: 現在の累計スコア。
- **`totalEarnedCoins: number`**: 現在のゲームプレイ中に獲得したコインの累計。
- **`totalFlightTicks: number`**: 現在のゲームプレイ中に経過した航行 Tick 数の合計。
- **`collectedItemCount: number`**: 現在のゲームプレイ中に回収したアイテム数の累計。
- **`coins: number`**: 現在の所持金。
- **`inventory: ItemContainer`**: プレイヤーのグローバルインベントリ（未装備アイテム等）。
- **`blackMarketVisits: number`**: 闇市場（BLACK MARKET）への到達累計回数。

### メソッド (Methods)

- **`initialize(): void`**
    - ゲーム開始時の初期状態を構築する。
    - **挙動**:
        1. `GameDataRepository.getInitialSetup()` を参照し、初期パラメータを取得。
        2. 取得した所持金を自身の `coins` にセット。
        3. セクター番号を `0` にセット。
        4. 累計スコア、総獲得コイン、合計航行 Tick 数、総回収アイテム数、闇市場訪問回数を `0` にセット。
        5. 初期装備アイテムのインスタンスを生成し、`inventory` に追加。

- **`incrementSector(): void`**
    - セクター番号を 1 インクリメントする。

- **`recordBlackMarketVisit(): void`**
    - 闇市場訪問回数を 1 インクリメントする。

- **`applySettlement(result: SettlementResult): void`**
    - 航行結果（報酬・アイテム増減）を現在の状態に適用する。
    - **内部挙動**:
        1. **金銭・スコア**: `coins += result.totalCoins`, `totalEarnedCoins += result.totalCoins`, `totalScore += result.totalScore` を実行。
        2. **航行時間**: `totalFlightTicks += result.flightTicks` を実行。
        3. **回収数**: `result.acquiredItems` から今回正式に獲得したアイテム数を集計し、`collectedItemCount` へ加算する。
        4. **新規アイテム追加**: `result.acquiredItems` の各アイテムを `inventory` へ追加。
        5. **天体へのアイテム移動**: `result.lostToTarget` が存在する場合、対象の天体（母星またはクラッシュ先）にアイテムを移動する（`result.lostToTarget.target.addItems(result.lostToTarget.items)`）。

- **`applyTransaction(transaction: TransactionResult): TransactionDelta`**
    - 施設取引などの資産変化を現在の状態に適用する。
    - コイン支払い、コイン取得、アイテム取得、アイテム削除はアチーブメント・記録に影響するため、個別画面や施設サービスで直接 `coins` / `inventory` を変更せず、このメソッドへ集約する。
    - 施設固有の副作用（例: Repair Dock の修理・強化）は `onCommit` callback に委譲する。ただし callback は支払いと対象 item の存在確認が通った後にのみ実行される。
    - **内部挙動**:
        1. `spentCoins` が現在の `coins` を超える場合は、状態を変更せず例外を投げる。
        2. `requiredItems` / `removedItems` が inventory に存在するか確認し、存在しない場合は状態を変更せず例外を投げる。
        3. `removedItems` を inventory から削除する。
        4. `onCommit` が指定されていれば実行し、追加の `earnedCoins` / `acquiredItems` を受け取る。
        5. `coins = coins - spentCoins + earnedCoins` を実行。
        6. `totalEarnedCoins += earnedCoins` を実行。
        7. `acquiredItems` の各アイテムを `inventory` へ追加し、`collectedItemCount` を加算する。
        8. 記録・実績更新に使える `TransactionDelta` を返す。

- **`getGameResultSummary(context: { completedSectors: number }): GameResultSummary`**
    - ゲームリザルト画面およびゲーム1プレイ結果記録に渡す最終集計値を返す。
    - `completedSectors` は成功・失敗・施設滞在などの呼び出し文脈で決まるため、`SessionState` の保持プロパティにはせず、呼び出し側が明示的に渡す。
    - **戻り値**:
        - `totalScore`: 累計スコア。
        - `totalCoins`: ゲームプレイ中に獲得した総コイン。
        - `completedSectors`: クリアしたセクター数。
        - `reachedSector`: クリアしたかどうかに関わらず到達した最大セクター。
        - `totalFlightTicks`: 合計航行 Tick 数。
        - `collectedItemCount`: 総回収アイテム数。

## 3. データ構造定義 (Data Structures)

### `GameResultSummary`
1プレイ単位の最終集計値。
```javascript
{
  totalScore: number,
  totalCoins: number,
  completedSectors: number,
  reachedSector: number,
  totalFlightTicks: number,
  collectedItemCount: number
}
```

### `TransactionResult`
施設取引などで確定した資産変化。
```javascript
{
  spentCoins: number,
  earnedCoins: number,
  acquiredItems: Item[],
  requiredItems?: Item[],
  removedItems?: Item[],
  onCommit?: (context: { removedItems: Item[] }) => {
    earnedCoins?: number,
    acquiredItems?: Item[]
  }
}
```

### `TransactionDelta`
記録・実績更新用の差分。
```javascript
{
  spentCoins: number,
  earnedCoins: number,
  acquiredItemCount: number,
  removedItemCount: number
}
```
