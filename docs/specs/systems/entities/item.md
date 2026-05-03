# Specification: Item Class

## 1. 役割と責務 (Role & Responsibility)
- **所属ドメイン**: Entity Domain
- **生存期間**: Exist Lifecycle
- **役割**: ゲーム内に存在するすべての個体アイテムの基底クラス。
- **責務**:
    - アイテムの基本属性（名称、重量、カテゴリ、特殊効果等）の保持。
    - 個体ごとの状態（現在の耐久度、強化内容）の管理。
    - 強化によるパラメーター補正の適用。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **Identity & Meta**
    - `readonly id: string`: マスターデータ上の ID。
    - `readonly uid: string`: インスタンス固有のユニーク ID。
    - `readonly name: string`: 名称。
    - `readonly category: string`: カテゴリ。
    - `readonly rarity: string`: レアリティ。
    - `readonly description: string`: 説明文。
- **Physical & Status**
    - `mass: number`: 重量。
    - `charges: number`: 現在の耐久度。
    - `maxCharges: number`: 最大耐久度。
- **Capability (Base Stats)**
    - `precision: number`: 軌道予測の基礎距離。
    - `pickupRange: number`: アイテム回収の基礎半径。
    - `power: number`: 射出パワーの基礎値。
    - `slots: number`: 提供スロット数。
- **Multipliers (Bonuses)**
    - `precisionMultiplier: number`: 予測精度倍率。
    - `pickupMultiplier: number`: 回収範囲倍率。
    - `gravityMultiplier: number`: 重力耐性倍率。
    - `powerMultiplier: number`: 射出パワー倍率。
    - `arcMultiplier: number`: 出口判定拡大倍率。
- **Action & Effects**
    - `duration: number`: 効果持続時間。
    - `preventsLauncherWear: boolean`: ランチャー摩耗防止フラグ。
    - `onLostBonus: boolean`: ロスト保険フラグ。
    - `ghostType: string`: ゴースト表示の種類。
- **Special (Cargo / Coin)**
    - `deliveryGoalId: string`: 貨物の目的地。
    - `coinDiscount: number`: 施設割引率。
    - `score: number`: 獲得スコア。
- **Enhancement Data**
    - `enhancements: Record<string, number>`: プロパティ別の強化実行回数。
        - **対象キーと 1 回あたりの増分**:
            - `slots`: +1
            - `precisionMultiplier`: +0.2
            - `pickupMultiplier`: +0.2
            - `gravityMultiplier`: -0.1 (最小 0.1)
            - `maxCharges`: +1 (耐久アイテムのみ)

### メソッド (Methods)
- **`constructor(id: string)`**
    - 指定された ID に基づき、マスターデータを読み込んで初期化する。
    - **uid の生成**: `IDGenerator.generate('item')` を用いて生成する。全サブクラスは独自に uid を生成する仕様に変更されたため、クラス名に依存しません。
    - **初期値のルール**:
        - Multiplier 系（`precisionMultiplier` 等）: マスターデータに定義がない場合は `1.0` で初期化する。
        - 加算系（`mass`, `precision`, `slots`, `maxCharges` 等）: マスターデータに定義がない場合は `0` で初期化する。
        - **理由**: `maxCharges` が `0` であることをもって「耐久機能（プロパティ）を保持していない」と判定するため。
- **`consumeCharge(): boolean`**
    - 耐久度を 1 減らし、`charges <= 0` になった場合に `true`（破棄）を返す。
    - **`maxCharges === 0` の場合（使い切りアイテム）**: `charges` の操作は行わず、即座に `true`（破棄）を返す。
- **`getViewData(): ItemViewData`**
    - UI 表示（アイテムカード）用のプレーンオブジェクトを生成して返す。
    - **マッピング**:
        - `uid`: 自身の `uid`
        - `name`, `category`, `description`: 自身のプロパティ
        - **`stats`**: 以下のプロパティを `{ value, enhanceCount }` 形式で格納する。
            - **Physical**: `mass`, `charges`, `maxCharges`
            - **Capability**: `precision`, `pickupRange`, `power`, `slots`
            - **Multipliers**: `precisionMultiplier`, `pickupMultiplier`, `gravityMultiplier`, `powerMultiplier`, `arcMultiplier`
            - ※各項目の `enhanceCount` は、`enhancements[key]`（累計強化回数）を格納する。

- **`enhance(): string`**
    - 自身に対してランダムな強化（または修理）を 1 つ実行する。
    - **抽選ルール**:
        - 自身の属性から有効な強化候補をリストアップし、その中からランダムに 1 つを選択する。
        - 候補: `slots`, `precisionMultiplier`, `pickupMultiplier`
        - 条件付き候補:
            - `gravityMultiplier`: 現在の値が `0.1` 超の場合に対象。
            - 耐久性向上: `maxCharges` が `0` 超の場合に対象。
    - **適用ルール**:
        - **修理**: 「耐久性向上」が選択され、かつ `charges < maxCharges` の場合。
            - `charges` を +1 する（この際、`enhancements` は加算されない）。
        - **強化**: 上記以外の場合。
            - 対象プロパティを規定値分加算する。
            - 特例: `maxCharges` が強化された場合は、同時に `charges` も +1 する。
            - `enhancements[key]` を +1 する。
    - **戻り値**: 適用された強化のキー名称（UI でのフィードバック用）。
- **`equals(other: Item): boolean`**
    - 自身と他のアイテムが「論理的に同一（スタック可能）」であるか判定する。
    - **判定基準**: 
        - ID が一致していること。
        - 動的性能（現在の耐久度、最大耐久度、プロパティ別の強化回数 (`enhancements`)、および各パラメーターの補正値）が完全に一致していること。
