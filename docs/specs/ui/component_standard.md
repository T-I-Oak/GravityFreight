# UI Component Standard: Gravity Freight V2

本ドキュメントでは、UIを構成する各要素の意味、実装（HTMLタグ）、およびデザイン基準を定義する。
V2では V1 同様、Matte（マット）、Neon（ネオン）、Printing（印刷）の複数スタイルを切り替え可能な設計とし、その柔軟性を 3層のレイヤー構造によって担保する。

---

## 1. CSS 設計の 3層モデル

すべてのコンポーネントは、以下の3つのレイヤーでスタイルを管理する。

1.  **意味の層 (Semantic Layer / Base)**: `ui_base.css`
    - 役割：物体の「形」と「構造」の定義。
    - 例：角丸の半径、フレックスの配置、基本図形（平行四辺形など）。
2.  **スタイルの層 (Style Layer / Expression)**: `ui_style_matte.css`, `ui_style_neon.css`, `ui_style_printing.css` 等
    - 役割：物体の「質感」と「色彩」の定義。各ビジュアルスタイル（Matte/Neon/Printing）ごとに個別のファイルを用意し、切り替えて使用する。
    - 例：透過背景、カテゴリカラーのボーダー、影を排したコントラスト表現（Matte構成時）。
3.  **個別の層 (Individual Layer / Context)**: `ui_base.css` または 各画面固有のCSS
    - 役割：「文脈」に応じた外観（主にサイズ・余白）の微調整。
    - **カプセル化ルール**: 各画面固有の調整を行う際は、必ずその画面のトップレベル ID（例：`#archive-screen`）をセレクタの起点とし、他の画面へ影響が波及しないようカプセル化（スコープ限定）を行うこと。
    - 例：アーカイブ画面内のみでのフォントサイズ調整、ロケット内部でのコンポーネントのダウンサイジング（`.rocket-details .ui-badge` 等）。

---

## 2. 主要コンポーネント定義

### 2.1 Item Card (アイテムカード)
- **タグ構造**: `<article class="ui-item-card is-clickable is-active is-[category]">`
- **主要な挙動**:
    - **ホバー・フィードバック**: `.is-clickable` 時のみ明るさの強調(brightness(1.15))と、枠線の強調を行う。
    - **選択状態 (`.is-active`)**: カテゴリカラーを背景に強く(15〜25%)合成し、枠線を明るく強調する。
    - **背景合成 (Tint)**: `ui_base.css` の `color-mix` とスタイルレイヤーの変数により、透過/不透過を切り替える。
    - **高密度設計**: 標準パディング `8px 12px` で統一。

### 2.2 Durability Gauge (耐久度ゲージ)
- **クラス**: `.durability-gauge` / `.durability-unit`
- **基本形状**: 
    - **常用サイズ**: 幅10px（実効8px）、高さ5px（実効3px）。
    - **ミニ版 (`.is-mini`)**: 10px 行高に収まる極小サイズ。ロケット詳細等で使用。
- **色彩基準**: 点灯時はカテゴリーカラーを反映。

### 2.3 UI Badge (汎用バッジ系)
- **規約**: 基盤として `.ui-badge` を持ち、特定の用途（スタック数等）には派生クラスを組み合わせて使用する。
- **実装例**: `<div class="ui-badge is-stack is-mini">x5</div>`
- **デザイン基準**:
    - **標準サイズ**: フォント 13px、角丸 4px。
    - **ミニ版 (`.is-mini`)**: 10px 行高に最適化。

### 2.4 Enhanced State (強化状態)
- **クラス**: `.is-enhanced` をプロパティやゲージに付与。
- **表現基準**:
    - **プロパティ**: アズールブルー（`#00d4ff`）を基調とし、値の末尾に `✦` 記号を付与。
    - **耐久度**: ゴールド（`#ffd700`）の専用外枠を付与。

---

## 3. HTML セマンティクス

| 役割 | 推奨タグ | 備考 |
| :--- | :--- | :--- |
| ルート容器 | <main id="..."> | 画面の主要コンテンツ。画面ID（#archive-screen等）を付与する起点。 |
| 独立した機能単位 | <article id="..."> | カード、特定の画面として完結する単位。必要に応じてIDを付与。 |
| 属性情報 | <header> <footer> | カード内の名称エリア、プロパティエリア。 |
| インジケーター | <div> | ゲージやバッジ自体など、意味論的なテキストを持たない要素。 |
---

## 4. データ構造定義 (Data Interface)

`UIComponents.generateCardHTML(item, options)` の `item` 引数に渡すべきデータ構造を以下に定義する。

### 4.1 基本プロパティ (Core)
- `id` (string): アイテムの種類を特定するID。
- `uid` (string, optional): 個別の個体を識別するためのインスタンスID。所持アイテムの操作等で使用。
- `name` (string): 表示名称。
- `category` (string): カテゴリー識別子（`chassis`, `logic`, `launcher`, `module`, `booster`, `coin`, `cargo`, `rocket`）。これに基づき CSS 変数 `--category-color` が適用される。
- `description` (string, optional): 説明文。存在しない場合はレンダリングをスキップする。
- `rarity` (number, optional): レアリティ定数。ヘッダーの配色等に影響。

### 4.2 状態・計測プロパティ (Status & Metrics)
- `count` (number, optional): スタック数。2以上の場合に右上に `.is-stack` バッジを表示。
- `maxCharges` / `charges` (number, optional): 耐久度。存在する場合に `.durability-gauge` を表示。
- `slots`, `mass`, `power`, `precisionMultiplier` (number, optional): 各種性能パラメータ。存在する場合に `.ui-item-card__prop` カプセルを表示。

### 4.3 強化・特殊プロパティ (Enhancements)
- `enhancement` (object, optional): 強化データ。
    - `slots` / `charges`: 強化されている場合に `.is-enhanced` クラスと特殊インジケーター（✦印など）が付与される。

### 4.4 複合構造プロパティ (Composition)
- `modules` (Array<Object>, optional): ロケット等に含まれる内包モジュールのリスト。
    - 各要素は `{ name, maxCharges, charges, count }` を持ち、カード下部の `.rocket-details` エリアに高密度表示される。
