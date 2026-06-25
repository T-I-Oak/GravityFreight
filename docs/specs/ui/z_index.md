# Z-Index / Layering Specification

## 1. 目的
この文書は Gravity Freight の UI 重なり順を定義する。
`z-index` は画面ごとの場当たり的な値ではなく、共通 token を基準に管理する。

## 2. グローバル階層
アプリ全体に影響する重なり順は `design_tokens.css` の token を使用する。

| Token | 用途 |
| :--- | :--- |
| `--z-world` | canvas、背景、マップなどゲーム世界の描画 |
| `--z-hud` | HUD、タイトルメニュー、画面フッターなど通常 UI |
| `--z-panel` | ビルドパネル、固定操作パネル、星情報パネル |
| `--z-modal` | 通常モーダル、画面内ダイアログ |
| `--z-system` | 設定、記録、ゲーム結果、通知など画面全体を覆う system UI |

## 3. 派生階層
同じグローバル階層内で前後関係が必要な場合は、直値ではなく `calc(var(--z-*) + n)` を使用する。

- system overlay: `calc(var(--z-system) + 100)` 以上
- system toast: `calc(var(--z-system) + 400)` など、同じ画面内の modal より前面に出す
- panel 内 tooltip: `calc(var(--z-panel) + 1)` など、所属する階層から小さく加算する

## 4. 局所階層
コンポーネント内部の装飾や疑似要素の前後関係は、小さい直値を使用してよい。
ただし、局所階層は親要素の stacking context 内に閉じること。

- 推奨範囲: `0` から `99`
- 例: 印刷物の stamp、カード内の seal、局所的な装飾 layer
- `100` 以上の直値は、グローバル階層を意図している可能性が高いため使用しない

## 5. 禁止事項
- production CSS で `z-index: 1000` などの意味を持たない大きな直値を使わない。
- 既存要素の上に出したいだけの理由で `--z-system` を超える値を追加しない。
- mock 専用操作 UI を除き、HTML inline style でグローバル `z-index` を定義しない。

## 6. 確認方法
- production CSS では、グローバル階層に `var(--z-*)` または `calc(var(--z-*) + n)` を使用する。
- `100` 以上の直値 `z-index` が production CSS に残っていないことをテストで確認する。
