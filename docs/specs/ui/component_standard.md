# UI Component Standard: Gravity Freight V2

本ドキュメントでは、UIを構成する各要素の意味、実装（HTMLタグ）、およびデザイン基準を定義する。
クラス命名と共通スタイルの責務は `design_philosophy.md` および `common_style.md` に従う。

---

## 1. CSS 設計の基本

すべてのコンポーネントは、共通スタイルと画面固有スタイルを分離して管理する。

- Tokens: 色、フォント、間隔、z-index などの定数を定義する。
- Common: 複数画面で使う構造、部品、状態、質感を定義する。
- Screen: 画面固有の配置、背景、遷移、サイズ調整を定義する。

詳細な境界は `common_style.md` に定義する。

### 1.1 色と状態の伝播
コンポーネントが現在の施設、カテゴリー、テーマ、状態に応じて色や強調を変える場合は、意味に基づくトークン、`.theme-*`、`.texture-*`、`.state-*` を優先して使う。
特定画面の都合だけで共通部品の色や状態を直接上書きしない。

---

## 2. 主要コンポーネント定義
 
### 2.1 Component Class Matrix
共通コンポーネントは、Function class を中心に、必要な State / Type / Texture / Theme を組み合わせて表現する。

| Component | Function | Type | State | Texture / Theme |
| :--- | :--- | :--- | :--- | :--- |
| Item Card | `.ItemCard` | `.chassis`, `.logic`, `.launcher`, `.module`, `.booster`, `.cargo`, `.rocket`, `.story-card` | `.state-clickable`, `.state-selected`, `.state-compact`, `.state-mini`, `.state-enhanced` | 親の `.theme-*` に従う |
| Placeholder Card | `.ItemCard` | `.placeholder-card` | `.state-clickable`, `.state-new` | 親の `.theme-*` に従う |
| Durability Gauge | `.DurabilityGauge` | なし | `.state-active`, `.state-enhanced`, `.state-mini` | 親の `.theme-*` に従う |
| Badge | `.Badge` | `.item-count`, `.rank` | `.state-mini`, `.state-new`, `.state-locked` | 親の `.theme-*` に従う |
| Button | `.Button` | なし | `.state-primary`, `.state-disabled`, `.state-active` | 親の `.theme-*` に従う |
| Panel | `.Panel` | 画面固有種別 | `.state-active`, `.state-locked` | `.texture-glass`, `.texture-plate`, `.texture-paper` |
| Well | `.Well` | なし | なし | `.texture-plate`, `.texture-paper` |
| Facility Badge | `.FacilityBadge` | `.trading-post`, `.repair-dock`, `.black-market` | なし | 親の `.theme-*` に従う |
| Story Modal | `.Panel` | `.story-modal` | なし | 親の `.theme-*` に従う |
| How To Play Slider | `.HowToPlaySlider` | `.how-to-play-screen`, `.how-to-play-slide` | `.state-active`, `.state-animating` | 親の `.theme-*` に従う |
| Diagram Canvas | `.DiagramCanvas` | `.diagram-area` | なし | 画面固有スタイルで定義 |

### 2.2 Item Card
アイテム、貨物、ロケット、物語カードの基盤となるコンポーネント。

- **Function**: `.ItemCard`
- **基本タグ**: `<article>`
- **識別属性**: 操作用 ID は `data-id` / `data-uid` などの data 属性で渡す。
- **Type**: アイテムカテゴリは `.chassis`、`.logic`、`.launcher`、`.module`、`.booster`、`.cargo`、`.rocket` を使う。
- **State**:
    - `.state-clickable`: ホバー・クリック時のフィードバックを有効化。
    - `.state-selected`: 選択中。カテゴリ色を背景や枠へ反映して強調する。
    - `.state-compact`: 説明文を省略し、名称と主要プロパティを優先する。
    - `.state-mini`: 高密度表示用。サイズは共通トークンで制御する。
    - `.state-enhanced`: 強化済みプロパティまたは耐久度を示す。
- **内部要素**: ヘッダー、説明文、プロパティ、ステータス、ロケット詳細は lower-case の種別 class で定義する。
- **画面固有境界**: 一覧の列幅、並び順、カード間隔は画面固有スタイルで定義する。

### 2.3 Placeholder Card
アイテムやスロットが空であることを示すカード。

- **Function**: `.ItemCard`
- **Type**: `.placeholder-card`
- **State**:
    - `.state-clickable`: クリックで選択や追加へ進める場合に使う。
    - `.state-new`: ユーザーの注意を促す必要がある場合に使う。
- **表示内容**: メインメッセージと補足メッセージを持つ。
- **画面固有境界**: 表示文言、空スロットの数、配置は画面仕様で定義する。

### 2.4 Story Card
物語の発見やログを表示するカード。

- **Function**: `.ItemCard`
- **Type**: `.story-card`
- **State**:
    - `.state-new`: 未読または新着の物語。
    - `.state-clickable`: クリックで本文を開く場合に使う。
- **Domain Type**: 施設に紐づく物語は `.trading-post`、`.repair-dock`、`.black-market` を併用する。
- **表示内容**: タイトル、発見文、通知用 Badge または Icon を持つ。

### 2.5 Durability Gauge
耐久度をセグメントで表示するコンポーネント。

- **Function**: `.DurabilityGauge`
- **State**:
    - `.state-active`: 点灯中のセグメント。
    - `.state-enhanced`: 強化済み耐久度。
    - `.state-mini`: 10px 行高に収める小型表示。
- **用途**: ItemCard のヘッダー、ロケット詳細、施設修理画面。
- **画面固有境界**: セグメント数はデータに従い、CSS 側で独自に増減しない。

### 2.6 Badge
短い状態、数量、ランク、通知を表示する小型コンポーネント。

- **Function**: `.Badge`
- **Type**: `.item-count`、`.rank` など、表示対象の意味を併用する。
- **State**:
    - `.state-mini`: 小型表示。
    - `.state-new`: 新着。
    - `.state-locked`: 未解除。
- **用途**: スタック数、ランク、実績 tier、通知ラベル。

### 2.7 Button
ユーザー操作を受ける標準コンポーネント。

- **Function**: `.Button`
- **基本タグ**: `<button>`
- **State**:
    - `.state-primary`: 画面内の最優先アクション。
    - `.state-disabled`: 操作不可。
    - `.state-active`: 現在選択中のタブまたはトグル。
- **内部要素**: メインラベルとサブラベルは lower-case の種別 class で定義する。
- **画面固有境界**: ボタン幅や配置は画面仕様で定義する。操作状態の意味は共通 State を使う。

### 2.8 Panel / Well
情報をまとめる大きな枠と、パネル内のトレイ状領域。

- **Panel Function**: `.Panel`
- **Well Function**: `.Well`
- **Panel 内部**: ヘッダー、本文、フッターを持てる。
- **Texture**:
    - `.texture-glass`: 透明感のあるパネル。
    - `.texture-plate`: 不透明寄りの端末パネル。
    - `.texture-paper`: 印刷物風のカードやレポート。
- **画面固有境界**: パネルの最大幅、高さ、カラム配置は画面仕様で定義する。

### 2.9 Facility Badge
施設種別と施設名を示すバッジ。

- **Function**: `.FacilityBadge`
- **Type**: `.facility-badge`
- **Domain Type**: `.trading-post`、`.repair-dock`、`.black-market`
- **表示内容**: アイコン、施設カテゴリ、施設名。
- **用途**: 施設画面、Story Modal、施設に紐づく通知。

### 2.10 Story Modal
物語の全文を表示する大型パネル。

- **Function**: `.Panel`
- **Type**: `.story-modal`
- **Domain Type**: 物語の発生施設に応じた施設種別を併用する。
- **内部要素**: FacilityBadge、タイトル、導入文、本文、閉じる Button。
- **本文**: 手紙やログの改行を維持する。

### 2.11 How To Play Components
説明書画面は、共通コンポーネントと画面固有レイアウトを組み合わせる。

- **画面ルート Type**: `.how-to-play-screen`
- **Slider Function**: `.HowToPlaySlider`
- **Slide Type**: `.how-to-play-slide`
- **Diagram Function**: `.DiagramCanvas`
- **Diagram Type**: `.diagram-area`
- **State**:
    - `.state-active`: 現在表示中のページ。
    - `.state-animating`: ページ切り替え中。
- **画面固有境界**: 背景画像、スライドトラック、本文ブロック、ページナビゲーション、canvas の具体配置は How To Play 仕様で定義する。

---

## 3. HTML セマンティクス

| 役割 | 推奨タグ | 備考 |
| :--- | :--- | :--- |
| ルート容器 | <main id="..."> | 画面の主要コンテンツ。画面ID（#archive-screen等）を付与する起点。 |
| 独立した機能単位 | <article id="..."> | カード、特定の画面として完結する単位。必要に応じてIDを付与。 |
| 属性情報 | <header> <footer> | カード内の名称エリア、プロパティエリア。 |
| インジケーター | <div> | ゲージやバッジ自体など、意味論的なテキストを持たない要素。 |
---

## 4. コンポーネント生成メソッド (Generation Methods)

各コンポーネントは `UIComponents.js` を通じて動的に生成することを推奨する。

### 4.1 Item Card 生成
- **メソッド**: `UIComponents.generateCardHTML(itemViewData, options)`
- **主要引数**:
    - `itemViewData` (ItemViewData): `Item.getViewData()` / `RocketItem.getViewData()` などから取得した表示用データ。詳細は「5. データ構造定義」を参照。
    - `options` (Object): 
        - `isClickable` (bool): ユーザー操作（ホバーエフェクト等）を許可。
        - `isActive` (bool): 選択状態（強調）として描画。
        - `isCompact` (bool): コンパクトバリエーションを適用（情報の省略）。
        - `isMini` (bool): ミニバリエーションを適用（サイズの縮小）。
        - `status` (string): `delivered` (配達済) や `unmatched` (不適合) など、この表示箇所に限った状態バッジを表示。`ItemViewData` 本体には含めない。

### 4.2 Story Card 生成
- **メソッド**: `UIComponents.generateStoryCardHTML(storyId, gameDataRepository, isNew)`
- **主要引数**:
    - `storyId` (string): 物語データを特定する ID。
    - `gameDataRepository` (GameDataRepository): ストーリー本文と施設定義の取得窓口。
    - `isNew` (bool): 新着通知アニメーションの有無。

### 4.3 Placeholder Card 生成
- **メソッド**: `UIComponents.generatePlaceholderHTML(text, subtext, options)`
- **主要引数**:
    - `text` (string): メインメッセージ。
    - `subtext` (string): 案内・補足メッセージ。
    - `options` (Object):
        - `category` (string): 背景やサブテキストの色を指定（'theme', 'home' 等）。
        - `isNotable` (bool): ガイダンスアニメーションの有効化。
        - `isClickable` (bool): ホバー反応の有効化。

### 4.4 Story Modal 生成
- **メソッド**: `UIComponents.generateStoryModalHTML(storyId, gameDataRepository)`
- **主要引数**:
    - `storyId` (string): 物語データを特定する ID。
    - `gameDataRepository` (GameDataRepository): ストーリー本文と施設定義の取得窓口。

### 4.5 Facility Badge 生成
- **メソッド**: `UIComponents.generateFacilityBadgeHTML(type)`
- **主要引数**:
    - `type` (string): 施設タイプ（`TRADING_POST`, `REPAIR_DOCK`, `BLACK_MARKET`）。

---

## 5. データ構造定義 (ItemViewData)

`UIComponents.generateCardHTML(itemViewData, options)` の `itemViewData` 引数に渡すべき、表示用のプレーンなオブジェクト構造。

### 5.1 基本プロパティ (Identity & Visuals)
- **`uid` (string)**: **操作用 ID**。UI がこのアイテムを特定（選択・抽出・分解等）してシステムへ伝えるために使用する。
    - インベントリ表示（スタック表示）時は、`StackedItem.uid` をセットする。
- **`name` (string)**: 表示名称。
- **`category` (string)**: カテゴリー識別子。カードの色（`--current-color`）を決定する。
    - 例: `chassis`, `logic`, `launcher`, `module`, `booster`, `rocket`, `cargo` 等。
- **`description` (string, optional)**: 説明文。

### 5.2 状態・数量 (Status & Quantity)
- **`count` (number, optional)**: スタック数。2以上の場合に表示される。

### 5.3 性能パラメータ (Stats)
- **`stats` (Object, required)**: `Item` インスタンスの各プロパティをキーとし、表示用データを値とするオブジェクト。Item Card の正式入力では必須とし、旧来のフラットな性能プロパティは受け付けない。
- **各項目の構造**: `{ value: number, enhanceCount: number }`
    - **`value` (number)**: 生の数値。書式設定は UI 側が行う。
    - **`enhanceCount` (number)**: 当該プロパティに対する累計強化実行回数。UI 側で強化状態の判定（0超の場合）や段階表示に使用する。

| カテゴリ | stats キー | 意味 |
| :--- | :--- | :--- |
| **Physical** | `mass` | 重量 |
| | `charges` | 現在の耐久度 |
| | `maxCharges` | 最大耐久度 |
| **Capability** | `precision` | 軌道予測の基礎距離 |
| | `pickupRange` | アイテム回収の基礎半径 |
| | `power` | 射出パワーの基礎値 |
| | `slots` | 提供スロット数 |
| **Multipliers** | `precisionMultiplier` | 予測精度倍率 |
| | `pickupMultiplier` | 回収範囲倍率 |
| | `gravityMultiplier` | 重力影響軽減倍率 |
| | `powerMultiplier` | 射出パワー倍率 |
| | `arcMultiplier` | 出口判定拡大倍率 |


### 5.4 複合構造 (Composition)
- **`modules` (Array<ItemViewData>, optional)**: **ロケット専用**。内包されているパーツのデータのリスト。
    - 各要素は `generateCardHTML` を通じて再帰的に描画される。

### 5.5 標準プロパティラベル (Standard Labels)
UI上で表示する各種パラメータのラベルは、以下の表記に統一する。
- `SLOTS`: 拡張スロット数。
- `PRECISION`: 航行予測線の精度倍率（x1.2 など）。
- `PICKUP`: アイテム回収範囲の倍率（x1.5 など）。
- `GRAVITY`: 重力影響の軽減率等の物理パラメータ。
- `THRUST`: エンジン推力。

---

## 6. 共通レイアウト・ユーティリティ (Layout Utilities)

画面やコンテナをまたいで使用可能な、汎用的なレイアウト支援クラス。

### 6.1 UI Flex Center (中央寄せ)
- **責務**: 中央寄せを行う汎用レイアウト支援。
- **役割**: 要素を親コンテナに対して垂直・水平方向の中央に配置し、テキストも中央揃えにする。
- **適用例**: 
  - タイトル画面のロゴとメニュー全体のセンタリング。
  - ダイアログや通知メッセージの配置。
  - アイテムリストが空の際のプレースホルダー表示。
- **構造**: `display: flex` / `flex-direction: column` をベースとし、子要素が縦並びで中心に集まるように定義されている。
