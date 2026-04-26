# UI Component Standard: Gravity Freight V2

本ドキュメントでは、UIを構成する各要素の意味、実装（HTMLタグ）、およびデザイン基準を定義する。
V2では V1 同様、Matte（マット）、Neon（ネオン）、Printing（印刷）の複数スタイルを切り替え可能な設計とし、その柔軟性を 3層のレイヤー構造によって担保する。

---

## 1. CSS 設計の 3層モデル

すべてのコンポーネントは、以下の構造でスタイルを管理する。

- **0. Tokens (定数層)**: `design_tokens.css`。すべての層で共有される「色、フォント、間隔、z-index」等の定数定義。

### 3層レイヤーモデル
1.  **意味の層 (Semantic Layer / Base)**: 
    - `ui_base.css`: リセット、html/body/main等、アプリケーションの最も基本的な属性。
    - `ui_layout.css`: パネル、カラム、格子系など、構造を作るレイアウトエンジン。
    - `ui_primitives.css`: バッジ、アイコン、ゲージなど、原子単位の共通部品。
    - `ui_item_card.css`: アイテムカードの構造と基本特性。
    - 役割：物体の「形」と「構造」の定義。
2.  **スタイルの層 (Style Layer / Expression)**: `ui_style_matte.css`, `ui_style_neon.css` 等
    - 役割：物体の「質感」と「色彩」の定義。各ビジュアルスタイルごとに個別のファイルを用意し、切り替えて使用する。
    - 例：透過背景、カテゴリカラーのボーダー、影を排したコントラスト表現。
3.  **個別の層 (Individual Layer / Context)**: 各画面固有のCSS等
    - 役割：「文脈」に応じた外観（主にサイズ・余白）の微調整。
    - **カプセル化ルール**: 各画面固有の調整を行う際は、必ずその画面のトップレベル ID（例：`#archive-screen`）をセレクタの起点とし、他の画面へ影響が波及しないようカプセル化を行うこと。
    - 例：アーカイブ画面内のみでのフォントサイズ調整、ロケット内部でのコンポーネントのダウンサイジング（`.rocket-details .ui-badge` 等）。

### 3. 色の伝播 (Color Propagation)
V2 では、特定のコンポーネント（ボタン、バッジ、ウェル等）が「現在の状況（施設、カテゴリー、テーマ）」に応じた色を自動的に纏うよう、共通変数 **`--current-color`** を使用する。
- **定義場所**: `ui_base.css` のクラス（`.is-trading-post`, `.is-theme` 等）で定義。
- **利用場所**: 各コンポーネントの色指定で `var(--current-color)` を参照。
- **メリット**: HTML 側でコンテナに `is-trading-post` を一度付与するだけで、内部の全要素の色が一括制御される。

### [DRY/一貫性のための例外処置]
特定のコンポーネントにおいて、全スタイルで共通の「核となる視覚特性（カテゴリー色の反映等）」を保証し、かつスタイルの追加・変更時の二重定義を防ぐ必要がある場合、例外的に **Base レイヤーで色の混合（`color-mix`）等の定義を行うこと**を推奨する。これにより、スタイルの切り替え後も「要素が持つ本来の属性（カテゴリー色等）」が損なわれず、保守性が向上する。

---

## 2. 主要コンポーネント定義
 
### 2.1 Item Card (アイテムカード：基本)
すべてのカード型要素の基盤となるコンポーネント。
- **基本構造**: `<article class="ui-item-card" data-id="...">`
- **共通修飾クラス (Modifier Classes)**:
    - `.is-clickable`: ホバー・クリック時のフィードバックを有効化。
    - `.is-active`: 選択状態。カテゴリー色を背景に 15〜25% 合成し強調。
    - `.is-[category]`: カテゴリー（`chassis`, `logic`, `launcher`, `module`, `booster`, `coin`, `cargo`, `rocket`）に応じた色情報（`--current-color`）の付与。
    - `.is-compact`: **コンパクトモード**。説明文とフッター（プロパティエリア）を非表示にし、垂直方向のサイズを大幅に圧縮する。
    - `.is-mini`: **ミニモード**。フォントサイズやパディングを全体的にスケールダウンさせ、高密度レイアウトへの埋め込みに最適化する。
- **デザイン基準**: 標準パディング `8px 12px`（通常）、`4px 8px`（ミニ）。
    - **実装上の注意**: ミニモード時のサイズ制約（height等）は、スタイルレイヤー（Matte/Neon）による詳細度の上書きを防ぎ、以前の視覚的整合性をあらゆる文脈で強制するため、意図的に `!important` を付与して定義されている。

### 2.2 Placeholder Card (プレースホルダー：空のスロット)
アイテムが存在しない状態を示すためのカード型コンポーネント。
- **基本構造**: 
  ```html
  <article class="ui-item-card is-placeholder">
      <div class="placeholder-text">MAIN MESSAGE</div>
      <div class="placeholder-subtext">Guidance subtext</div>
  </article>
  ```
- **共通修飾クラス (Modifier Classes)**:
    - `.is-notable`: ガイドアニメーション（`ui-guide-pulse`）を有効化。**サブテキストのみ**が点滅し、ユーザーの注意を引く。
    - `.is-clickable`: ホバー・クリックフィードバックを有効化。
    - `.is-[category/theme/home]`: サブテキストにカテゴリー色を付与。枠とメインテキストは常に共通のグレーを維持する。
- **生成メソッド**: `UIComponents.generatePlaceholderHTML(text, subtext, options)`
- **デザイン基準**: 境界線は `dashed`（点線）、背景は透明、全体的に `opacity: 0.6` の落ち着いた外観。

### 2.3 Story Card (ストーリーカード：派生)
アイテムカード（`.ui-item-card`）を拡張した物語用コンポーネント。
- **追加クラス**: `.is-story` (必ず `.ui-item-card` と併用)
- **追加される特性**:
    - **ダブルライン・インジケーター**: 左端に 8px 幅の特殊ボーダー（3px カテゴリー色 / 2px 隙間 / 3px カテゴリー色）を付与。内部的には `border-left` と `box-shadow` を組み合わせて実装。
    - **レイアウト調整**: インジケーター分、`padding-left: 16px` となる。
- **用途**: 物語の発見（Discovery）やログの表示に使用。

### 2.4 Durability Gauge (耐久度ゲージ)
- **クラス**: `.durability-gauge` / `.durability-unit`
- **基本形状**: 
    - **常用サイズ**: 幅10px、高さ5px。
    - **ミニ版 (`.is-mini`)**: 10px 行高に収まる極小サイズ。
- **色彩基準**: 点灯時は **`--current-color`** を反映。
- **実装上の注意**: `.is-mini` 時の `8x3px` サイズは、高密度表示における視覚的整合性を最優先するため、`!important` によって強制適用される。

### 2.5 UI Badge (汎用バッジ系)
- **基本構造**: `<div class="ui-badge">`
- **修飾クラス (Modifier Classes)**:
    - `.is-stack`: スタック数表示用。右上に配置。
    - `.is-mini`: 10px 行高に最適化された最小サイズ。
    - **実装上の注意**: ベースの `.ui-badge` が持つ `min-height` 制約を確実に解除し、10px の高さを保証するため、`min-height: 0 !important` 等が指定されている。

### 2.6 Enhanced State (強化状態)
- **用途**: プロパティ値や耐久度に対する視覚的な強調。
- **修飾クラス**: `.is-enhanced`
- **表現基準**:
    - **数値**: アズールブルー色と `✦` 記号の付与。
    - **耐久度**: ゴールド（`#ffd700`）の専用外枠を付与。

### 2.7 UI Button (ボタン)
- **基本構造**: `<button class="ui-button">`
- **修飾クラス (Modifier Classes)**:
    - `.is-primary`: 画面内の最優先アクション。塗りつぶし背景。
    - `.is-big`: 大型カプセル形状。高さ 48px（プレイ画面の特定ボタンのみ 76px に拡張）。`.btn-main-label` と `.btn-sub-label` を内包可能。
    - `.is-disabled`: 操作無効状態。
- **視覚効果**: ネオンスタイルでは `.is-big` に対してのみ、強力な外光（Glow）演出が適用される。

### 2.8 Interactive Icon & State (アイコンと通知)
- **基本構造**: `<span class="ui-icon">`
- **修飾クラス (Modifier Classes)**:
    - `.is-clickable`: アイコン単体へのユーザー操作（scale変化）を許可。
    - `.is-new`: 新着通知。アニメーション `ui-mail-pulse` (1.5s) を適用。
    - `.is-icon-mail`: メール（封筒）形状のアイコン。
- **共通フィードバック**:
    - **ホバー時**: `.is-clickable` に対して `scale(1.2)` の拡大。
    - **アクティブ時**: アイコン単体では `scale(0.95)`、大きなカード全体では `scale(0.98)` の縮小を適用。

### 2.9 UI Well (データウェル：くぼみ)
要素を一歩奥に引っ込ませ、パネル内の「情報のトレイ」として機能させるためのコンポーネント。
- **基本構造**: `<div class="ui-well">`
- **デザイン基準**: 
    - **Base (構造)**: パディング `var(--space-double)` を持ち、角丸（標準 8px）で囲む。
    - **Style (質感 )**: Matte スタイルでは「左上からの深いインセットシャドウ」と「右下の微細なハイライト」により、物理的な彫り込みを表現する。
- **用途**: カラムの背景、データの塊の視覚的グルーピング。

### 2.10 Facility Badge (施設バッジ)
施設画面（交易所等）のヘッダーで使用される、所属と名称を象徴する高精度バッジ。
- **基本構造**: 
  ```html
  <div class="facility-badge">
      <div class="badge-icon">...</div>
      <div class="badge-info">
          <span class="badge-label">CATEGORY</span>
          <span class="badge-name">FACILITY NAME</span>
      </div>
  </div>
  ```
- **デザイン基準**: 背景に `--current-color` の暗い透過色を敷き、左側にソリッドな色の帯（インジケーター：同じく `--current-color` を参照）を持つ。

### 2.11 Story Modal (ストーリーモーダル)
物語の全文を表示するための大型パネルコンポーネント。
- **基本構造**: `<article class="ui-panel is-story">`
- **デザイン基準**:
    - **背景**: 施設カラー（`--current-color`）を 80% 透過で背景に合成。
    - **導入文 (`.is-intro`)**: 太字・イタリック体で強調。
    - **本文 (`.ui-well`)**: 手紙やログの改行を維持（`white-space: pre-wrap`）。
- **生成メソッド**: `UIComponents.generateStoryModalHTML(storyId)`

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
- **メソッド**: `UIComponents.generateCardHTML(item, options)`
- **主要引数**:
    - `item` (Object): アイテム属性データ。詳細は「5.1 基本プロパティ」を参照。
    - `options` (Object): 
        - `isClickable` (bool): ユーザー操作（ホバーエフェクト等）を許可。
        - `isActive` (bool): 選択状態（強調）として描画。
        - `isEnhanced` (bool): 強化状態の外枠を表示。
        - `isCompact` (bool): コンパクトバリエーションを適用（情報の省略）。
        - `isMini` (bool): ミニバリエーションを適用（サイズの縮小）。
        - `status` (string): 'delivered' (配達済) や 'unmatched' (不適合) などの状態バッジを表示。

### 4.2 Story Card 生成
- **メソッド**: `UIComponents.generateStoryCardHTML(storyId, isNew)`
- **主要引数**:
    - `storyId` (string): 物語データを特定する ID。
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
- **メソッド**: `UIComponents.generateStoryModalHTML(storyId)`
- **主要引数**:
    - `storyId` (string): 表示するストーリーの ID。

---

## 5. データ構造定義 (Data Interface)

`UIComponents.generateCardHTML(item, options)` の `item` 引数に渡すべきデータ構造。

### 5.1 基本プロパティ (Core)
- `id` (string): アイテムの種類を特定するID。
- `uid` (string, optional): 個別の個体を識別するためのインスタンスID。所持アイテムの操作等で使用。
- `name` (string): 表示名称。
- `category` (string): カテゴリー識別子。
    - **アイテム用**: `chassis`, `logic`, `launcher`, `module`, `booster`, `coin`, `cargo`, `rocket`。
    - **施設・サービス用**: `trading-post`, `repair-dock`, `black-market`。これらを指定することで、アイテムではない「施設サービス」等のカードを施設テーマ色（`--current-color`）で統一的に描画できる。
- `description` (string, optional): 説明文。存在しない場合はレンダリングをスキップする。
- `rarity` (number, optional): レアリティ定数。

### 5.2 状態・計測プロパティ (Status & Metrics)
- `count` (number, optional): スタック数。2以上の場合に右上に `.is-stack` バッジを表示。
- `maxCharges` / `charges` (number, optional): 耐久度。存在する場合に `.durability-gauge` を表示。
- `slots`, `mass`, `power`, `precisionMultiplier` (number, optional): 各種性能パラメータ。存在する場合に `.ui-item-card__prop` カプセルを表示。

### 5.3 強化・特殊プロパティ (Enhancements)
- `enhancement` (object, optional): 強化データ。
    - `slots` / `charges`: 強化されている場合に `.is-enhanced` クラスと特殊インジケーター（✦印など）が付与される。

### 5.4 複合構造プロパティ (Composition)
- `modules` (Array<Object>, optional): ロケット等に含まれる内包モジュールのリスト。
    - 各要素は `generateCardHTML` を通じて、自動的に **`.is-compact.is-mini`** が適用された状態で `.rocket-details` エリアに高密度表示される。
    - これにより、内包要素であってもメインのアイテム同様に「カテゴリーカラー」や「耐久度ゲージ」が視覚的に保持される。

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
- **クラス**: `.ui-flex-center`
- **役割**: 要素を親コンテナに対して垂直・水平方向の中央に配置し、テキストも中央揃えにする。
- **適用例**: 
  - タイトル画面のロゴとメニュー全体のセンタリング。
  - ダイアログや通知メッセージの配置。
  - アイテムリストが空の際のプレースホルダー表示。
- **構造**: `display: flex` / `flex-direction: column` をベースとし、子要素が縦並びで中心に集まるように定義されている。
