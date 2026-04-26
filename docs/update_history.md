# Gravity Freight V2: Update History

## [1.8.7] - 2026-04-26
### Added
- アイテムカードの高密度表示バリエーション (`.is-compact`, `.is-mini`) を実装。
- `UIComponents.js` に `isCompact`, `isMini` オプションを追加。
- ロケットのモジュールリストを `.is-compact.is-mini` を用いた高密度表示に刷新。

### Changed
- **[重要]** アイテムカードおよびプリミティブ（バッジ、ゲージ）の幾何構造制御を `!important` から CSS 変数ベースのリファクタリングに変更。
- `component_standard.md` を更新し、変数によるジオメトリ制御の設計指針を明文化。

### Fixed
- 「混乱したAI」による `!important` の不適切な使用を排除。
- 耐久度ゲージの点灯色がカテゴリーカラーに依存していたドキュメントの誤記を修正（常にテーマカラーを反映）。

### Technical Notes
- **3層モデルの遵守**: Baseレイヤー（幾何構造）とStyleレイヤー（質感）の責務を明確に分離。
- **詳細度管理**: 修飾クラスによる変数の上書きにより、Matte/Neon 両スタイルでの視覚的整合性を確保。
