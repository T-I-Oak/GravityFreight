# Specification: EconomySystem Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain (Service)
- **生存期間**: App Lifecycle
- **役割**: 経済・取引・抽選ロジック。
- **責務**:
    - **アイテム出現抽選**: `world_config.md` の定義に基づき、指定されたコンテキスト（セクター配置、拠点ボーナス等）に応じたアイテムの重み付け抽選（Lottery）の実行。

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
