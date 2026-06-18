# Specification: EconomySystem Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain (Service)
- **生存期間**: App Lifecycle
- **役割**: 経済・取引・抽選ロジックの外部窓口。
- **責務**:
    - **アイテム出現抽選**: `world_config.md` の定義に基づき、指定されたコンテキスト（セクター配置、拠点ボーナス等）に応じたアイテムの重み付け抽選（Lottery）の実行。
    - **航行結果の精算**: `SettlementCalculator` へ委譲し、報酬、獲得アイテム、遺失物、割引率を含む `SettlementResult` を生成する。
    - **施設取引ルール**: 共通価格は `PricingService`、交易所在庫は `TradingPostService` へ委譲する。
    - **ゲームオーバー判定**: 航行結果確定後および施設退出時に共通利用する詰み状態判定を提供する。
    - **Facade**: GameController や Sector など外部利用者は、原則として個別サービスではなく `EconomySystem` を呼び出す。

### 内部サービス

- **`SettlementCalculator`**
    - 航行終了時の精算処理を担当する。
    - `drawLottery()` が必要な配送ボーナス抽選は、`EconomySystem` を lottery service として受け取り委譲する。
- **`PricingService`**
    - 共通割引計算、修理費、解体費など、施設をまたいで使う価格計算を担当する。
- **`TradingPostService`**
    - Trading Post の在庫生成と特売品設定を担当する。
    - アイテム抽選は `EconomySystem` を lottery service として受け取り委譲する。
- **`BlackMarketService`**
    - Black Market の 100c / 500c ガチャを担当する。
    - アイテム抽選は `EconomySystem` を lottery service として受け取り委譲し、資産反映は `SessionState.applyTransaction()` に任せる。
- **`RepairDockService`**
    - Repair Dock の修理、解体、強化の取引準備を担当する。
    - 支払い、対象 item の存在確認、inventory への反映は `SessionState.applyTransaction()` に任せる。
    - 修理・強化など施設固有の副作用は、支払い成功後に実行される `TransactionResult.onCommit` に閉じ込める。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`drawLottery(session: SessionState, count: number, options: object): Item[]`**
    - `world_config.md` 3.2項のアルゴリズムに基づき、指定された個数のアイテムを抽選する。
    - **引数**:
        - `session`: 現在のセクター番号（`sectorNumber`）を参照するために使用。
        - `count`: 抽選するアイテムの総数。
        - `options`:
            - `bonusThreshold`: しきい値への加算補正（通常は 0）。
            - `excludeCategories`: 抽選対象外とするカテゴリの配列。
    - **内部ロジック**:
        1. 基準しきい値を計算: `14 + session.sectorNumber + options.bonusThreshold`
        2. 各アイテムの重みを計算: `しきい値 - 出現率`
        3. 重みに基づき、`options.excludeCategories` を除外したプールから指定された `count` 分を抽出・インスタンス化して返す。

- **`calculateSettlement(collision: object, flightData: FlightResultData, session: SessionState): SettlementResult`**
    - 航行結果に基づき、報酬の内訳と資産の変化を確定させる。
    - `session` は配送ボーナス抽選のセクター番号参照に使用する。抽選の責務は `EconomySystem` が持ち、`Rocket` は配送ボーナスを抽選しない。
    - **内部ロジック**:
        0. **ステータス（status）と目的地（destination）の決定**:
            - `collision.type === 'arc'` → `'cleared'`, `destination = target.getFacilityType()`
            - `collision.type === 'body'` 且つ `target.isHome` → `'returned'`, `destination = null`
            - `collision.type === 'body'` 且つ `!target.isHome` → `'crashed'`, `destination = null`
            - それ以外（画面外逸脱等） → `'lost'`, `destination = null`
        1. **基本明細（SettlementEntry）の作成**:
            - 報酬の発生源ごとに `entries` を追加する。不要な 0 はプロパティごと省略する。
            - **Flight Duration**: Label は UI resource `flightResult.entries.flightDuration` を使用し、Score: `flightData.ticks`（Coin は省略）
            - **Goal Bonus**: 施設到達報酬。Label は UI resource `flightResult.entries.goalBonus` を使用し、Score/Coin は到達施設の `rewardScore` / `rewardCoins`。
            - **拾得コイン**: Label は UI resource `flightResult.entries.collectedCoins` を使用し、Coin: `totalCollected`（Score は省略）
        2. **アイテム・配送結果の集計とレポート作成**:
            - `flightData.heldCargo` を精査し、貨物・コイン・パーツ等を分類して、航行結果画面の回収リストに表示する `itemReport` を構築する。
            - `itemReport` は正式に回収・配送結果として提示するものだけを含める。大破・遭難で失われる、または天体へ移動するだけのアイテムは `COLLECTED SPACE ASSETS` に表示しない。
            - **スタック集約ルール**: アイテムを一つずつ取り出し、既存の各 `StackedItem` に対して `add(item)` を実行する。`true` が返れば集約完了とし、すべてのスタックが `false` を返した場合のみ新規スタックを生成する。
            - **一致配送（Match）**:
                - `Cargo` のうち `deliveryGoalId` を持つものだけを配送対象として扱う。
                - 同一の配送対象貨物を集約した `ItemReportEntry (type: 'delivery', status: 'match')` を作成する（`StackedItem` の集約ルールを適用）。
                - そのグループに属する全貨物から発生した **全ボーナスアイテム** を、`session.sectorNumber` を参照した `drawLottery()` で抽選し、`StackedItem` のルールに従って集約し、`bonusItems` に格納する。
                - ボーナス実体のうち、コインは `totalCoins` に加算し、パーツ類は `acquiredItems` に追加する。
                - `entries` に UI resource `flightResult.entries.deliveryBonus` の Label で、Score/Coin: 配送成功報酬 + ボーナスコインを追加する。
                - **物語解放**: `unlockedBranchId` に対象施設のブランチ ID を設定する。
            - **不一致配送（Unmatched）**:
                - `deliveryGoalId` を持つ配送対象貨物が到達施設と一致しない場合、`ItemReportEntry (type: 'delivery', status: 'unmatched')` を作成。
                - 不一致配送報酬は UI resource `flightResult.entries.deliveryBonus` の明細へ加算する。配送成功報酬がある場合は同じ明細に合算する。
            - **特殊 Cargo**:
                - `cargo_lucky` のように `Cargo` カテゴリだが `deliveryGoalId` を持たないアイテムは、配送対象ではない。
                - 施設到達時の航行結果アイテム表示では `ItemReportEntry (type: 'other')` として扱い、`status: 'unmatched'` を付与しない。
                - `cargo_lucky` は配送報酬を発生させず、割引率の集計だけに使う。
            - **その他回収物（Other）**:
                - `cleared` または `returned` で正式に回収される Cargo 以外のアイテム、および特殊 Cargo に対し、`StackedItem` のルールに従って集計・スタック化を行う。
                - 各スタックに対し `ItemReportEntry (type: 'other')` を作成する。
                - コインは `totalCoins` へ加算し、inventory に入るアイテムは `acquiredItems` に追加する。
            - **大破・遭難**:
                - `crashed` / `lost` では保持アイテムは正式回収されないため、`itemReport` には追加しない。
        3. **アイテムの移動判定**:
            - **帰還（Returned）**: `Cargo` 種別のアイテムのみを母星（`collision.target`）の `lostToTarget` に格納し、Cargo 以外は回収扱いにする。
            - **大破（Crashed）**: `heldCargo` および生存した `RocketItem` 内の構成パーツ（chassis / logic / modules、50% 判定）を衝突天体の `lostToTarget` に格納。
        4. **保険金の算定と明細追加**:
            - `status` が `'crashed'` または `'lost'` の場合のみ実行。
            - `RocketItem` 内に `mod_insurance` 装備時、その個数を $N$ とする。
            - **計算**: `RocketItem` 内の構成パーツ（chassis / logic / modules）の査定価格合計 × N
            - **明細追加**: `entries` に UI resource `flightResult.entries.insurancePayout` の Label で、Coin: `算出額` を追加する（Score は省略）。複数モジュールによる倍率は算出額に反映し、Label には個数を含めない。
        5. **幸運の導きの集計**:
            - `status === 'cleared'` の場合、`heldCargo` 内の `cargo_lucky` の個数をカウントし、`luckyDiscountRate` (個数 * 0.1) を設定する。
        6. 最終的な資産増減およびステータスを含む `SettlementResult` を生成して返す。
### 施設取引ロジック (Facility Transactions)

- **`generateTradingPostStock(session: SessionState): StockItem[]`**
    - 交易所で販売される 6 個のアイテムリストを生成する。
    - **ルール**:
        - `drawLottery` を用い、`excludeCategories: ['cargo', 'coin']` で 6 個抽出。
        - 各アイテムの `price` は `appraisalValue * 2`（端数切捨て）。
        - 在庫のうち 1 つをランダムに「特売品」とし、`itemDiscount: 0.3` を設定する。
- **`calculateFinalPrice(originalPrice: number, luckyDiscount: number, itemDiscount: number = 0): number`**
    - **共通割引ルール**: `finalDiscount = Math.min(0.5, luckyDiscount + itemDiscount)`
    - **計算**: `Math.floor(originalPrice * (1.0 - finalDiscount))`
- **`calculateRepairCost(launcher: Item, luckyDiscount: number): number`**
    - 基本価格（耐久 1 回復 = 10c）に対し、`calculateFinalPrice` を適用する。
- **`calculateDismantleCost(countInSession: number, luckyDiscount: number): number`**
    - 基本価格 `50 * (countInSession + 1)` に対し、`calculateFinalPrice` を適用する。
- **`drawBlackMarketGacha(type: 'normal' | 'premium', session: SessionState, luckyDiscount: number): TransactionResult`**
    - 闇市場のガチャを実行し、`SessionState.applyTransaction()` に渡す資産変化を返す。
    - 価格は 100c / 500c を基準とし、luckyDiscount がある場合は `calculateFinalPrice` を適用した額を `spentCoins` に設定する。
    - `EconomySystem` / `BlackMarketService` は session の所持金や inventory を直接変更しない。
    - 各アイテムは、抽選後に強化判定を行い、強化後の査定価格を合計して排出ライン到達を判定する。
    - **Normal**: 強化後の査定価格合計が 100c 以上になるまで `drawLottery(session, 1, { bonusThreshold: 0, excludeCategories: ['cargo', 'coin'] })` を繰り返す。各アイテムは 50% の確率で 1 回強化される。
    - **Premium**: 強化後の査定価格合計が 500c 以上になるまで `drawLottery(session, 1, { bonusThreshold: 5, excludeCategories: ['cargo', 'coin'] })` を繰り返す。各アイテムは 50% で 2 回、25% で 1 回強化される。
- **`createRepairTransaction(launcher: Item, luckyDiscount: number): TransactionResult`**
    - Repair Dock の発射台修理取引を作成する。
    - 対象は inventory 内の damaged launcher とし、`requiredItems` に対象 launcher を指定する。
    - コストは耐久 1 回復につき 10c。luckyDiscount がある場合は `calculateFinalPrice` を適用する。
    - `onCommit` は支払い成功後に `launcher.repair(1)` を実行する。
- **`createDismantleTransaction(rocketItem: RocketItem, countInSession: number, luckyDiscount: number): TransactionResult`**
    - Repair Dock のロケット解体・強化取引を作成する。
    - `removedItems` に対象 `RocketItem` を指定する。
    - コストは `50 * (countInSession + 1)`。luckyDiscount がある場合は `calculateFinalPrice` を適用する。
    - `onCommit` は支払い成功後、`RocketItem.getCompositionParts()` で取り出した chassis / logic / module item に `Item.applyMaintenance()` を 1 回ずつ実行し、`acquiredItems` として返す。

- **`checkGameOver(session: SessionState): object | null`**
    - ゲームオーバー（詰み状態）か判定し、理由を返す。
    - **利用箇所**: 航行結果確定後と施設退出時の両方から呼び出される共通判定ロジックとする。
    - **戻り値**: 継続可能な場合は `null`。詰んでいる場合は `{ reason: 'NO_PARTS_REMAINING', details: string[] }`。
    - **判定条件**: 以下のカテゴリごとに、インベントリ内の「使用可能な在庫」を確認する。
        - **`CHASSIS`**: 在庫が 0 個なら `details` に追加。
        - **`LOGIC`**: 在庫が 0 個なら `details` に追加。
        - **`LAUNCHER`**: 耐久度 1 以上の在庫が 0 個なら `details` に追加。

### データ構造定義 (Data Structures)

### `SettlementResult`
精算処理の最終結果。
- **`status: 'cleared' | 'returned' | 'crashed' | 'lost'`**: 航行の最終的な結末。
- **`destination: string | null`**: 到達した出口の施設タイプ（例: `TRADING_POST`）。クリア時以外は `null`。
- **`unlockedBranchId: string | null`**: 今回の航行で解放条件（一致配送）を満たした物語ブランチ ID。
- **`totalScore: number`**: 今回の航行で得た総スコア。
- **`totalCoins: number`**: 今回獲得した総コイン。
- **`luckyDiscountRate: number`**: ゴール時に運んだ「幸運の導き」による割引率（0.0～0.5）。
- **`flightTicks: number`**: 今回の航行で経過した Tick 数。ゲームリザルトの合計航行時間に加算される。
- **`entries: SettlementEntry[]`**: 報酬の明細リスト（一行にスコアとコインを併記）。
- **`itemReport: ItemReportEntry[]`**: 航行結果画面の回収リストに表示する構造化されたアイテムリスト。正式回収・配送結果として提示するものだけを含み、大破・遭難で失われるものは含めない。
- **`acquiredItems: Item[]`**: インベントリへ正式に追加されるアイテムの実体リスト（ボーナスアイテム + 回収パーツ）。
- **`lostToTarget: { target: object, items: Item[] } | null`**: クラッシュまたは母星帰還時、特定の天体に移動（蓄積）したアイテムリスト。

### `SettlementEntry`
- **`label: string`**: 表示名。
- **`score?: number`**: 加算スコア。省略時は UI 上で空欄（または非表示）。
- **`coin?: number`**: 加算コイン。省略時は UI 上で空欄（または非表示）。

### `ItemReportEntry`
- **`type: 'delivery' | 'other'`**: アイテムの種別。
- **`item: StackedItem`**: 集約されたアイテム情報。
- **`status?: 'match' | 'unmatched'`**: 配送の場合の結果。
- **`bonusItems?: StackedItem[]`**: 一致配送時に獲得した集約済みボーナスアイテム。

### `StackedItem`
- **`uid: string`**: スタック固有の識別子。
- **`id: string`**: マスターデータ ID。
- **`items: Item[]`**: スタックされている実体リスト。
- **`count: number`**: 合計個数（`items.length`）。

### `StockItem`
交易所の在庫アイテム情報。
- **`item: Item`**: アイテム実体。
- **`originalPrice: number`**: 割引前の基本価格。
- **`itemDiscount: number`**: アイテム固有の割引率（特売品は 0.3、通常は 0）。

### `DismantleResult`
解体・強化の結果。
- **`cost: number`**: 支払った費用。
- **`acquiredItems: Item[]`**: 強化されて戻ってきたパーツリスト。
