# Matte UI Component System Specification

## 1. 概要
Gravity Freight V2 における UI コンポーネントは、以下の 4 つの独立した軸（Orthogonal Axes）の組み合わせによって定義される。これにより、見た目の一貫性と機能の明確な伝達を両立する。

---

## 2. 構成 4 軸マトリクス

### A. 機能軸 (Capability)
「その要素で何ができるか」を定義する。
- **`.is-clickable`** (alias: `clickable`): ユーザーがクリック・タップ可能な要素。
  - 明暗の変化（Hover/Active）や、カーソルの指マーク（Pointer）などのフィードバックを伴う。
- **`.is-scrollable`**: 内容が溢れた場合にスクロール可能な要素。
- **`.is-draggable`**: 位置を移動可能な要素。

### B. 重要度軸 (Emphasis / Priority)
「情報の重要度や優先度」を定義する。
- **`.is-primary`**: 最優先アクション（推奨される次の操作）。
  - **Matte スタイル**: Solid（べた塗り）による最大の面強調。
  - **Neon スタイル**: 多重グローや高輝度ラインによる強調。
- **`.is-secondary`**: 補助的なアクションや代替案。
  - **Matte スタイル**: 暗い背景 + 控えめな枠線（内側への沈み込み）。
  - **Neon スタイル**: 単層グロー、または輝度を抑えたライン。
- **(なし/Default)**: 標準的な強調度。

### C. ステータス軸 (State)
「今どのような状態にあるか」を定義する。
- **(なし/Active)**: アクティブ。実行可能、または現在選択されている状態。本来の輝度と塗りを持つ。
- **`.is-inactive`**: 非アクティブ。背景を沈め、枠線と文字で「存在（選択肢）」のみを示す。
- **`.is-disabled`** (alias: `.disabled`): 無効。文字・枠・背景すべてを暗転させ、操作不能であることを示す。

### D. カラー軸 (Flavor / Theme)
「どの情報のカテゴリーに属するか」を定義する。
- **(なし/Default)**: システム標準カラー。
- **`.is-special`**: 個別色指定。タブグループの識別や、特定の機能グループを象徴する色。

---

## 3. 組み合わせた運用例

### 記録画面（Archive）のタブ選択
- **選択中**: `.ui-button.is-special`
- **非選択**: `.ui-button.is-special.is-inactive`
- **解説**: ボタン形状であるため、`.is-clickable` は不要。

### 記録画面（Archive）の戻るボタン
- **記述**: `.ui-button.is-secondary`
- **解説**: サブアクションとして `.is-secondary` を指定。サイズは標準（Default）。

### インタラクティブな行（Table Row）
- **記述**: `<tr class="is-clickable">`
- **解説**: 形状がボタンではないが、クリック可能であることを示すために機能軸のクラスを付与する。
