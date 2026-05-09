# Specification: ExitArc Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: World Domain
- **生存期間**: Stage Lifecycle
- **役割**: セクター出口の判定領域。
- **責務**:
    - 出口（ワープ開始点）の幾何学的定義。
    - ロケットの進入判定と、次セクターへの遷移トリガーの発行。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`angle: number`**: 出口の中心角度（度、0〜360）。
- **`width: number`**: 出口の開口幅（度）。施設タイプに応じて `DataManager` から取得。
- **`type: string`**: 施設タイプ（`TRADING_POST`, `REPAIR_DOCK`, `BLACK_MARKET`）。
- **`radius: number`**: 配置半径（`DataManager` の `boundaryRadius` を参照。標準 900）。

### メソッド (Methods)

- **`constructor(params: object)`**
    - **引数**: `angle`, `type` を含むオブジェクト。
    - **挙動**: 
        - `angle`, `type` をプロパティにセットする。
        - **`width` の解決**: `type` に基づき `DataManager` から対応する開口幅（60, 40, 20等）を取得してセットする。
        - **`radius` の解決**: `DataManager` から共通の `boundaryRadius`（900等）を取得してセットする。

- **`checkEntrance(targetPos: Vector2): boolean`**
    - 指定された座標（ロケットの位置）が、この出口の判定エリアに進入したかを判定する。
    - **判定順序**:
        1. 距離判定: `distance(origin, targetPos) >= this.radius - (DataManager から取得するマージン)`。
        2. 角度判定: `targetPos` の中心角が `[this.angle - this.width/2, this.angle + this.width/2]` の範囲内にあるか。
        3. 両方が真なら `true` を返す。

- **`getFacilityType(): string`** (未承認)
    - この出口に紐付いている施設タイプを返す。
