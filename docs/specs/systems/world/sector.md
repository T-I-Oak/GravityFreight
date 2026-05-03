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

### メソッド (Methods)

- **`constructor(session: SessionState, isAnomaly: boolean)`**
    - **挙動**:
        1. 引数の `isAnomaly` を自身のプロパティに保持する。
        2. `DataManager.getMasterConfig()` を参照し、配置定数（ベース星数 5）を取得する。
        3. **星の数の決定**: 「ベース星数 + `session.blackMarketVisits`」によって、このセクターに配置する天体の総数を決定する。
        4. **アイテム抽選**: 配置する天体ごとに 1〜2 個（計 `starCount * random(1,2)` 個）のアイテムを `EconomySystem.drawLottery(session, count, { excludeCategories: [] })` によって取得する。
        5. **天体配置**: セクター内に天体インスタンス（`CelestialBody`）を配置する。
            - **重力極性の決定**: 以下の **いずれか一方のみ** が該当する場合、その天体を斥力（反発）として生成する。両方該当、または両方該当しない場合は引力となる。
                - セクター全体がアノマリーである（`isAnomaly` が真）。
                - その天体に配置されたアイテムのレアリティが `ANOMALY` である。
        6. 生成した `CelestialBody` および `ExitArc` のインスタンスを自身に保持する。

- **`static fromSnapshot(snapshot: any): Sector`** *(保留)*
    - 保存されたスナップショットデータから `Sector` インスタンスを再構築する（リプレイ用）。
    - ※ `FlightRecorder` の仕様が未確定のため、インターフェースの詳細はその確定後に定義する。

- **`createSnapshot(): any`** *(保留)*
    - 現在の天体配置やアイテム状態をシリアライズ可能な形式で返す。
    - ※ `FlightRecorder` の仕様が未確定のため、インターフェースの詳細はその確定後に定義する。
