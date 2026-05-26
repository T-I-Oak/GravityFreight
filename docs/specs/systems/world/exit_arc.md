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
- **`width: number`**: 出口の開口幅（度）。施設タイプに応じて `GameDataRepository.getMasterConfig().arcFacilityWidths` から取得。
- **`type: string`**: 施設タイプ（`TRADING_POST`, `REPAIR_DOCK`, `BLACK_MARKET`）。
- **`radius: number`**: 配置半径。`GameDataRepository.getMasterConfig().boundaryRadius` を参照する。

### メソッド (Methods)

- **`constructor(params: object)`**
    - **引数**: `angle`, `type` を含むオブジェクト。
    - **挙動**:
        - `angle`, `type` をプロパティにセットする。
        - **`width` の解決**: `type` に基づき `GameDataRepository.getMasterConfig().arcFacilityWidths` から対応する開口幅を取得してセットする。
        - **`radius` の解決**: `GameDataRepository.getMasterConfig().boundaryRadius` を取得してセットする。

- **`checkEntrance(targetPos: Vector2): boolean`**
    - 指定された座標（ロケットの位置）が、この出口の判定エリアに進入したかを判定する。
    - **判定順序**:
        1. 距離判定: `distance(origin, targetPos) >= this.radius`。
        2. 角度判定: `targetPos` の中心角が `[this.angle - this.width/2, this.angle + this.width/2]` の範囲内にあるか。
        3. 両方が真なら `true` を返す。

- **`getFacilityType(): string`**
    - この出口に紐付いている施設タイプを返す正式 accessor。
    - **戻り値**: `TRADING_POST`, `REPAIR_DOCK`, `BLACK_MARKET` のいずれか。
    - **用途**:
        - 出口到達後の報酬計算。
        - 施設画面への遷移。
        - 貨物配送先との一致判定。
        - StorySystem の分岐解放。
    - `type` は `ExitArc` の内部状態として保持され、外部連携ではこのメソッドを通じて参照する。

- **`createSnapshot(): object`**
    - 現在の出口状態をシリアライズ可能な形式で抽出する。
    - **保存対象**:
        - `angle`
        - `type`
    - **保存しない値**:
        - `width`: `type` から基本幅を再解決する。
        - `radius`: `GameDataRepository.getMasterConfig().boundaryRadius` から再解決する。
        - 発射構成による出口判定補正: `Rocket` 側の発射構成から再計算し、航行判定側で同じ条件として適用する。

- **`static fromSnapshot(snapshot: object): ExitArc`**
    - `ExitArcSnapshot` から出口インスタンスを復元する。
    - **内部挙動**:
        1. `angle`, `type` を復元する。
        2. `radius` はマスタ設定から解決する。
        3. `width` は施設タイプの基本幅として再解決する。
        4. スナップショットに不足または不正な値がある場合は、データ整合性エラーとして例外を投げる。

## 3. データ構造定義 (Data Structures)

### ExitArcSnapshot
```javascript
{
  angle: number,
  type: string
}
```

- `angle` は出口の配置結果であり、発射時点のセクター再現に必要な変動値として保存する。
- `type` は施設種別であり、基本出口幅、報酬、施設遷移の再解決に使用する。
- 発射構成による有効出口幅の補正は `ExitArcSnapshot` には含めず、復元された `Rocket` の発射構成から航行判定時に再計算する。
