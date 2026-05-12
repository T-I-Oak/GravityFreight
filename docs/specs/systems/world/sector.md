# Specification: Sector Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: World Domain
- **生存期間**: Stage Lifecycle
- **役割**: セクター（ステージ）のデータコンテナおよび生成器。
- **責務**:
    - 天体（CelestialBody）および出口（ExitArc）の配置データの保持。
    - `world_config.md` に基づくマップの自動生成。
    - セクター全体のスナップショット（シリアライズ）機能の提供。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`bodies: CelestialBody[]`**: セクター内の重力源リスト。
- **`exits: ExitArc[]`**: セクター外周のゴールリスト。
- **`sectorNumber: number`**: このセクターの番号。
- **`isAnomaly: boolean`**: アノマリーセクター（5の倍数）フラグ。
- **`luckyDiscountRate: number`**: このセクターの施設訪問時に適用される「幸運の導き」割引率（0.0～0.5）。航行終了時に確定する。初期値 0。

### メソッド (Methods)

- **`constructor(session: SessionState, isAnomaly: boolean)`**
    - **挙動**:
        1. 引数の `isAnomaly` を自身のプロパティに保持する。
        2. **母星（Home Star）の配置**:
            - 座標 `(0, 0)`、引力固定、**`isHome: true`** の `CelestialBody` を生成し、`bodies` リストに追加する（リストの先頭）。
            - ※具体的な半径と質量は `CelestialBody` 内部で `DataManager` から取得される。
        3. **天体数の決定**:
            - `DataManager` のベース星数（標準 5）に `session.blackMarketVisits` を加算して決定する。
        4. **天体（CelestialBody）の配置生成**:
            - 決定した天体数（`starCount`）の分だけ、以下の手順を繰り返す。
            - **座標決定**: 以下の制約を満たすワールド座標 `(x, y)` を最大 100 回試行して決定する。
                - **距離制約**: すべての `bodies`（母星および配置済みの天体）から **180px 以上** 離れている。
                - **境界制約**: 原点からの距離が **700px 以下**（`DataManager` の定数を参照）。
            - **アイテム抽選**: 座標が決まった天体に対し、**1〜2 個のアイテムを `EconomySystem.drawLottery(session, count)` によって都度取得**する。
            - **属性決定**: 
                - `isRepulsion`: `isAnomaly` (セクター) **XOR** `取得したアイテムに ANOMALY レアリティが含まれるか`。
            - **実体化**: 確定したパラメータ（`position`, `isRepulsion`, `isHome: false`, `items`）を渡し、`CelestialBody` インスタンスを生成して `bodies` リストに追加する。
            - ※ 100回失敗した場合は、その天体の生成をスキップする。
        6. **出口（ExitArc）の配置生成**:
            - **角度計算（分割点方式）**:
                1. 占有角（全施設幅の合計 × 最大拡大率 2.0）と、最小マージンの合計（5度 × 3）を 360度から引いた「自由角（105度）」を算出する。
                2. 自由角を 3 つのランダムな隙間（`gap1, gap2, gap3`）に分配する。
                3. 施設順序をランダムに決定し、基準角から「隙間 ＋ 施設幅 ＋ マージン」を累積させて各出口の `angle` を算出する。
            - 確定したパラメータ（`angle`, `type`）を渡し、`ExitArc` インスタンスを生成して `exits` リストに追加する。
            - ※ `width` や `radius` はクラス内部で自動解決される。

- **`clone(): Sector`**
    - 現在の状態のコピーを生成して返す。内部的には `createSnapshot()` と `Sector.fromSnapshot()` を組み合わせて実現する。

- **`static fromSnapshot(snapshot: object): Sector`** *(保留)*
    - 保存されたスナップショットデータから `Sector` インスタンスを再構築する。リプレイ再生・クローン用。
- **`createSnapshot(): object`** *(保留)*
    - 現在のセクターの状態（天体配置、アイテム所持状態、出口構成）をシリアライズ可能な形式で抽出する。リプレイ保存用。
