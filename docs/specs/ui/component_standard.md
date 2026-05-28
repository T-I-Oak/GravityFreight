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
 
### 2.1 Item Card (アイテムカード：基本)
すべてのカード型要素の基盤となるコンポーネント。
- **基本構造**: `<article data-id="...">`
- **共通状態・バリエーション**:
    - 操作可能: ホバー・クリック時のフィードバックを有効化。
    - 選択中: カテゴリー色を背景に 15〜25% 合成し強調。
    - カテゴリー: `chassis`, `logic`, `launcher`, `module`, `booster`, `coin`, `cargo`, `rocket` に応じた色情報を付与。
    - コンパクト: 説明文とフッター（プロパティエリア）を非表示にし、垂直方向のサイズを圧縮する。
    - ミニ: フォントサイズやパディングを全体的にスケールダウンさせ、高密度レイアウトへの埋め込みに最適化する。
- **デザイン基準**: 標準パディング `8px 12px`（通常）、`4px 8px`（ミニ）。
    - **実装上の注意**: ミニモード時のサイズ制約（height等）は、詳細度管理を容易にしつつ、スタイルレイヤー（Matte/Neon）による不適切な上書きを防ぐため、ベースレイヤー側で定義された **CSS ジオメトリ変数** を用いて制御されている。

### 2.2 Placeholder Card (プレースホルダー：空のスロット)
アイテムが存在しない状態を示すためのカード型コンポーネント。
- **基本構造**: 
  ```html
  <article>
      <div class="placeholder-text">MAIN MESSAGE</div>
      <div class="placeholder-subtext">Guidance subtext</div>
  </article>
  ```
- **共通状態・バリエーション**:
    - 注目: ガイドアニメーションを有効化。サブテキストのみが点滅し、ユーザーの注意を引く。
    - 操作可能: ホバー・クリックフィードバックを有効化。
    - カテゴリーまたはテーマ: サブテキストにカテゴリー色を付与。枠とメインテキストは常に共通のグレーを維持する。
- **生成メソッド**: `UIComponents.generatePlaceholderHTML(text, subtext, options)`
- **デザイン基準**: 境界線は `dashed`（点線）、背景は透明、全体的に `opacity: 0.6` の落ち着いた外観。

### 2.3 Story Card (ストーリーカード：派生)
アイテムカードを拡張した物語用コンポーネント。
- **追加種別**: 物語用カードであることを示す種別を付与する。
- **追加される特性**:
    - **ダブルライン・インジケーター**: 左端に 8px 幅の特殊ボーダー（3px カテゴリー色 / 2px 隙間 / 3px カテゴリー色）を付与。内部的には `border-left` と `box-shadow` を組み合わせて実装。
    - **レイアウト調整**: インジケーター分、`padding-left: 16px` となる。
- **用途**: 物語の発見（Discovery）やログの表示に使用。

### 2.4 Durability Gauge (耐久度ゲージ)
- **構成**: ゲージ全体とセグメント要素で構成する。
- **基本形状**: 
    - **常用サイズ**: 幅10px、高さ5px。
    - **ミニ版**: 10px 行高に収まる極小サイズ。
- **デザイン基準**: 点灯時は **`--color-theme-main`**（テーマカラー）を反映。カテゴリー色には依存しない。
- **実装上の注意**: 高密度表示における視覚的整合性を最優先するため、ミニモード時のセグメントサイズ（8x3px）はベースレイヤーのジオメトリ変数によって厳密に管理されている。

### 2.5 UI Badge (汎用バッジ系)
- **基本構造**: `<div>`
- **バリエーション**:
    - スタック数表示: 右上に配置。
    - ミニ: 10px 行高に最適化された最小サイズ。
    - **実装上の注意**: ミニ表示では、共通のジオメトリ変数で高さ制約を上書きし、10px の高さを保証する。

### 2.6 Enhanced State (強化状態)
- **用途**: プロパティ値や耐久度に対する視覚的な強調。
- **状態**: 強化済みであることを示す状態として扱う。
- **表現基準**:
    - **数値**: アズールブルー色と `✦` 記号の付与。
    - **耐久度**: ゴールド（`#ffd700`）の専用外枠を付与。

### 2.7 UI Button (ボタン)
- **基本構造**: `<button>`
- **状態・バリエーション**:
    - Primary: 画面内の最優先アクション。塗りつぶし背景。
    - Large: 大型カプセル形状。高さ 48px（プレイ画面の特定ボタンのみ 76px に拡張）。メインラベルとサブラベルを内包可能。
    - Disabled: 操作無効状態。
- **視覚効果**: 発光表現を使う場合は、大型かつ重要な操作に限定する。

### 2.8 Interactive Icon & State (アイコンと通知)
- **基本構造**: `<span>`
- **状態・種別**:
    - 操作可能: アイコン単体へのユーザー操作（scale変化）を許可。
    - 新着: 新着通知アニメーションを適用。
    - メール: 封筒形状のアイコンとして扱う。
- **共通フィードバック**:
    - **ホバー時**: 操作可能なアイコンに対して `scale(1.2)` の拡大。
    - **アクティブ時**: アイコン単体では `scale(0.95)`、大きなカード全体では `scale(0.98)` の縮小を適用。

### 2.9 UI Well (データウェル：くぼみ)
要素を一歩奥に引っ込ませ、パネル内の「情報のトレイ」として機能させるためのコンポーネント。
- **基本構造**: `<div>`
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
- **基本構造**: `<article>`
- **デザイン基準**:
    - **背景**: 施設カラー（`--current-color`）を 80% 透過で背景に合成。
    - **導入文**: 太字・イタリック体で強調。
    - **本文**: 手紙やログの改行を維持（`white-space: pre-wrap`）。
- **生成メソッド**: `UIComponents.generateStoryModalHTML(content)`

### 2.12 How To Play Screen (説明書画面)
説明書画面は、共通 UI 部品と画面固有レイアウトを組み合わせて構成する。
- **基本スコープ**: `#how-to-play-screen` または同等のトップレベル要素を起点とする。
- **クラス命名**: 画面固有 class は `how-to-play-*` に統一し、将来のゲーム中 tutorial 用 class と衝突させない。
- **背景画像**: 各ページに対応する `public/assets/tutorial/slide1.png` から `slide7.png` をページ背景として表示する。
- **共通部品の利用**: アイテムカード、ボタン、バッジ等は共通スタイルで定義されたコンポーネントを優先して使う。
- **個別 CSS の範囲**: ページ背景、スライドトラック、本文ブロック、canvas 領域、ページナビゲーションなど、説明書固有の配置・遷移に限定する。
- **実装上の注意**: β v1 の CSS をそのまま移植せず、共通スタイルと画面スコープの境界に合わせて再構成する。

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
- **メソッド**: `UIComponents.generateItemCardHTML(item, options)`
- **主要引数**:
    - `item` (Object): アイテム属性データ。詳細は「5. データ構造定義」を参照。
    - `options` (Object): 
        - `isClickable` (bool): ユーザー操作（ホバーエフェクト等）を許可。
        - `isActive` (bool): 選択状態（強調）として描画。
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
- **メソッド**: `UIComponents.generateStoryModalHTML(content)`
- **主要引数**:
    - `content` (Object): 表示するストーリーの `title`, `discovery`, `body` などを含む表示用データ。

### 4.5 Facility Badge 生成
- **メソッド**: `UIComponents.generateFacilityBadgeHTML(type)`
- **主要引数**:
    - `type` (string): 施設タイプ（`TRADING_POST`, `REPAIR_DOCK`, `BLACK_MARKET`）。

---

## 5. データ構造定義 (ItemViewData)

`UIComponents.generateItemCardHTML(data, options)` の `data` 引数に渡すべき、表示用のプレーンなオブジェクト構造。

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
- **`stats` (Object, optional)**: `Item` インスタンスの各プロパティをキーとし、表示用データを値とするオブジェクト。
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
    - 各要素は `generateItemCardHTML` を通じて再帰的に描画される。

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
