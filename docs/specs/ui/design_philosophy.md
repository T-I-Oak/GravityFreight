# UI Design Philosophy: Gravity Freight V2

## 1. 核心的アイデンティティ (Design Identity)
Gravity Freight V2 のUIは、単なる「メニュー」ではなく、宇宙船やステーションに実在する「物理的・機能的ターミナル」として定義する。

### 1.1 マット・デザイン (The Matte Aesthetic)
- 非発行性 (Non-Emissive): 画面自体が光を放つ「ネオン」ではなく、物理的なパネルや不透明な素材に表示された情報の質感を追求する。
- 実用主義 (Functionalism): 派手な装飾ではなく、工業製品としての「使い込まれた道具」としての美しさを優先する。
- 高コントラストの視認性: 暗い背景に対して、意味のある情報を鮮明な（光の影響を受けない）色で提示する。

### 1.2 没入感の制約 (Immersion & Constraints)
現実世界のブラウザやOSの存在をプレイヤーに意識させないため、以下の制約を鉄則とする。

- 標準UI要素の使用禁止: alert(), confirm() などのブラウザ標準ダイアログや、HTMLの title 属性（チップヘルプ）の使用を全面的に禁止する。
- フォーカス制御: Tabキーによるフォーカス移動および、要素選択時に発生するフォーカスリング（アウトライン）を表示させない。
- 独自スクロールバーの徹底: ブラウザ標準のスクロールバーを表示させず、スタイル層で定義されたカスタムスクロールバーのみを使用する。
- 数値表記の統一: 
    - 数値は必ず3桁カンマ区切り（1,200）で表示する。
    - 単位は世界観に即したセット（pts: スコア, c: コイン, pcs: 個数, scs: セクター）を厳守する。

## 2. コンポーネントの4軸モデル (The 4-Axis Model)
すべてのUI要素（特にボタンやインタラクティブ要素）は、以下の4つの独立した軸の組み合わせで定義する。

| 軸 | 名称 (Axis) | 役割 | 例 |
| :--- | :--- | :--- | :--- |
| A | 機能 (Capability) | クリック可能か、何をするものか。 | .ui-button, .is-clickable |
| B | 重要度 (Emphasis) | 視覚的な優先順位。 | .is-primary (Solid), .is-secondary (Outline) |
| C | 状態 (State) | 現在のシステム上の状況。 | .is-active, .is-inactive, .is-disabled |
| D | フレーバー (Flavor) | どんなデータ・機能グループに属するか。 | .is-score, .is-sector, .is-contract |

## 3. 意味論に基づくトークン設計 (Semantic Tokenism)
色は「赤」や「青」という名前で定義せず、その色が持つ「情報の意味」に基づいて命名・管理する。
- データカテゴリ: num-score, num-sector など、数値が持つアイデンティティに基づく着色。
- システム状態: status-danger, status-success など、状況のフィードバックに基づく着色。

## 4. CSS設計のレイヤー構造 (Architectural Layers)
スタイルの衝突を防ぎ、拡張性を確保するため、以下の3層で構築する。

1. Tokens (定数階層): 色、フォント、間隔の数値定義。
2. Base/Capability (基底レイヤー): cursor: pointer や基本タイポグラフィ、レイアウトの骨格。
3. Style/Aesthetic (装飾レイヤー): Matte, Neon, Print など、特定の質感を付与する最上位の皮。
