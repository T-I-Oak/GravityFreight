# Common Style Specification: Gravity Freight

## 1. 目的
この文書は Gravity Freight で複数画面にまたがって使う class の名称、用途、責務を管理する台帳である。
GameWorks OAK 共通 Style Guide を前提に、Gravity Freight 固有の共通スタイルだけを定義する。

画面固有の配置、背景画像、スライド遷移、canvas 配置は各画面仕様で定義する。

モックは CSS のデグレード確認にも使用するため、単なる完成イメージではなく、実画面と同じ class 契約を共有する検証対象として扱う。
モックと実画面の class 構造が異なる場合は、実画面だけを独自実装せず、モック側の構造が不適切かどうかを確認してから両者を同じ契約へそろえる。
承認済みモックは画面仕様の一部として扱い、実装者判断だけで変更しない。
モック側に HTML 構造、class 責務、操作用 hook などの問題が見つかった場合は、問題点、修正案、実画面への影響を提示し、承認を得てからモックと実画面を同時に更新する。

## 1.1 Mockup / Implementation Class Contract

画面実装では、対応するモックと実画面が同じ class 契約を使うことを原則とする。
ここでいう class 契約は、画面ルート、パネル、セクション、ボタン、状態、種別、テーブル、カードなど、CSS が参照する class の組み合わせと責務を指す。

- `body` には画面テーマ class を置かない。各画面 root または overlay root が `.theme-*` を持ち、別テーマの画面へスタイルが漏れない境界を作る。
- 実画面だけに見た目調整用 class を追加しない。
- モックだけに残る class を前提に CSS を調整しない。
- JavaScript のイベント接続だけが目的の hook は、既存の構造 class や `id` で接続できないか先に検討する。
- どうしても実装上の hook class が必要な場合は、モックにも同じ class を追加する修正案を提示し、承認後に反映する。
- モックの HTML が実装上不適切な構造になっている場合も、実装側で黙って別構造にせず、モック修正案として扱う。

モックと実画面の class 契約をテストする場合は、全 class の完全一致ではなく、画面ごとに必須 class を指定して比較する。
状態、種別、データ依存 class は表示内容によって変化するため、機械的な完全一致の対象にしない。

## 2. Status
class の確定度は次の値で管理する。

| Status | 意味 |
| :--- | :--- |
| Approved | オーナー確認済み。新規実装で使用してよい |
| Draft | モック、既存仕様、画面仕様から用途が見えているが、実装前に最終確認する |
| Reserved | 将来使う可能性が高い名称。現時点では実装しない |

## 3. Class Naming Rules
Gravity Freight の class は GameWorks OAK 共通 Style Guide に従う。

| 種別 | 形式 | 用途 |
| :--- | :--- | :--- |
| Theme | `.theme-*` | 画面群または大きな領域の配色・雰囲気 |
| Function | `UpperCamelCase` | 構造、レイアウト、操作単位 |
| Texture | `.texture-*` | 表面的な質感、色、影、強調表現 |
| State | `.state-*` | 実行時に変化する状態 |
| Type | `lower-case` | 要素が何であるかを示す固有種別 |

機能、質感、状態、種別を 1 つの class に混在させない。
既存実装や検討資料の class を参照する場合も、この表の責務に分解してから新名称を決める。

画面ルートやパネルルートで配下全体の見た目を切り替えるコンテキストは、`.theme-*` として定義する。
特定の成功・失敗状態や施設種別は Theme ではなく、State または Type として扱う。

## 4. Themes
| Class | Status | 用途 | 主な使用箇所 |
| :--- | :--- | :--- | :--- |
| `.theme-neon` | Draft | 宇宙空間・高エネルギー感を表す発光系テーマ | タイトル、航行画面、重要アクション |
| `.theme-matte` | Draft | 施設内端末を表す非発光・実用寄りテーマ | 施設、建造、通常パネル |
| `.theme-printing` | Draft | 紙に印刷された事務的な通知を表すテーマ | 実績カード、リザルト、記録証 |

### 4.1 移行期間中の対応
この節は v2 作成中の移行指針であり、初版リリース時の仕様書からは削除する。
リリース版ドキュメントには β v1 / 旧仕様の class 名を残さない。

| v1 / 旧仕様 | v2 | 備考 |
| :--- | :--- | :--- |
| `ui-style--neon` | `.theme-neon` | Style Layer ではなく Theme として扱う |
| `ui-style--matte` | `.theme-matte` | Style Layer ではなく Theme として扱う |
| `ui-style--print` / `ui-style--printing` | `.theme-printing` | 表記は `.theme-printing` に統一する |
| `success-theme` / `failure-theme` | `.state-success` / `.state-failure` | リザルト状態であり、画面全体テーマではない |
| `theme-trading` / `theme-repair` / `theme-blackmarket` | `.trading-post` / `.repair-dock` / `.black-market` | 施設種別であり、Theme ではない |

## 5. Function Classes
構造や操作単位を表す class。見た目の質感や状態は `texture-*` と `state-*` で追加する。

| Class | Status | 用途 | 備考 |
| :--- | :--- | :--- | :--- |
| `.Button` | Draft | 汎用ボタン | 重要度や無効状態は state で表す |
| `.Panel` | Draft | 画面内の主要な情報ブロック | ヘッダー、本文、フッターを内包できる |
| `.ColumnSet` | Draft | 複数カラムの横並びレイアウト | 施設、Archive、建造画面 |
| `.SplitRow` | Draft | ラベルと値、タイトルと操作部などの横分割 | カードヘッダー、データ行 |
| `.TabGroup` | Draft | タブ切り替え領域 | Archive、建造カテゴリ |
| `.ScrollArea` | Draft | スクロール可能な領域 | パネル本文、一覧、説明書本文 |
| `.ItemCard` | Draft | アイテム、貨物、ロケット、物語カードの基盤 | 表示データは `component_standard.md` に従う |
| `.Badge` | Draft | 小型ラベル、スタック数、状態表示 | 数量や状態の短い表示 |
| `.DurabilityGauge` | Draft | 耐久度のセグメント表示 | ItemCard 内で使用 |
| `.FacilityBadge` | Draft | 施設種別と施設名を示すバッジ | 施設画面、Story Modal |
| `.Well` | Draft | 情報を一段奥に置くトレイ状領域 | 数値群、本文、補足欄 |
| `.AchievementCard` | Draft | 実績カード | Archive の Achievements |
| `.ReplayTable` | Draft | リプレイ一覧 | Archive の Replays |
| `.HowToPlaySlider` | Draft | How To Play のページ切り替え本体 | 説明書画面 |
| `.DiagramCanvas` | Draft | 説明・航行補助用 canvas 領域 | How To Play、航行予測表示 |

## 6. State Classes
実行時の状態を表す class。状態はコンポーネントの種類に依存しすぎない名称にする。

| Class | Status | 用途 | 備考 |
| :--- | :--- | :--- | :--- |
| `.state-active` | Draft | 現在ページ、現在タブ、点灯中ゲージなどの active 状態 | ItemCard のユーザー選択には使わない |
| `.state-disabled` | Draft | 操作不可 | ボタン、タブ、カード |
| `.state-selected` | Draft | ユーザーが選択した対象 | ItemCard、リスト行 |
| `.state-clickable` | Draft | クリック可能であることを示す | hover/active feedback の対象 |
| `.state-hidden` | Draft | 非表示 | 画面、overlay、パネル、タブ |
| `.state-primary` | Draft | 画面内の最優先操作 | Button で使用 |
| `.state-compact` | Draft | 情報量を抑えた表示 | ItemCard、Badge |
| `.state-mini` | Draft | 高密度の小型表示 | ItemCard、Badge、DurabilityGauge |
| `.state-new` | Draft | 新着、未読、未確認 | Story、通知、実績 |
| `.state-locked` | Draft | 未解除、使用不可 | 実績、機能、記録 |
| `.state-recorded` | Draft | 記録済み、保存済み | 航行結果、リプレイ |
| `.state-enhanced` | Draft | 強化済み | アイテム性能、耐久度 |
| `.state-delivered` | Draft | 配送条件を満たした | 航行結果、貨物表示 |
| `.state-unmatched` | Draft | 配送条件を満たしていない | 航行結果、貨物表示 |
| `.state-animating` | Draft | ページ遷移や演出中 | How To Play |
| `.state-success` | Draft | 成功、達成、クリア | リザルト、通知 |
| `.state-failure` | Draft | 失敗、ゲームオーバー、未達 | リザルト、通知 |

## 7. Texture Classes
質感や表面表現を表す class。構造、状態、画面全体のテーマは持たない。
ネオン、マット、印刷のように配下全体の表現を切り替えるものは Theme として扱う。

| Class | Status | 用途 | 備考 |
| :--- | :--- | :--- | :--- |
| `.texture-glass` | Draft | 透明感、背景ぼかし、ガラス面 | `.theme-neon` 内のパネル候補 |
| `.texture-plate` | Draft | 不透明寄りの物理パネル | `.theme-matte` 内のパネル候補 |
| `.texture-paper` | Draft | 紙面、印字、罫線 | `.theme-printing` 内のカード候補 |
| `.texture-metal` | Reserved | 金属パネル風の表面 | 施設・端末背景候補 |
| `.texture-alert` | Draft | 警告や注意喚起 | 危険状態、重要メッセージ |
| `.texture-success` | Draft | 成功、達成、配送完了 | リザルト、実績 |

## 8. Type Classes
要素が何であるかを示す lower-case の class。複数画面で同じ意味を持つものだけを登録する。

| Class | Status | 用途 | 備考 |
| :--- | :--- | :--- | :--- |
| `.score` | Draft | スコア値またはスコア関連表示 | 数値表記は3桁区切り |
| `.coin` | Draft | コイン値またはコイン関連表示 | 単位表示と併用 |
| `.sector` | Draft | 到達セクター、踏破セクター表示 | reached/completed の意味差に注意 |
| `.item-count` | Draft | 回収数、所持数、スタック数 | Badge での短縮表示を含む |
| `.rank` | Draft | ランク表示 | RankTracker の結果表示 |
| `.achievement-card` | Draft | 実績カードの固有種別 | Function は AchievementCard |
| `.replay-row` | Draft | リプレイ一覧の行 | ReplayTable 内 |
| `.placeholder-card` | Draft | 空スロットや未設定状態を示すカード | Function は ItemCard |
| `.story-card` | Draft | 物語表示カード | ItemCard の種別 |
| `.story-modal` | Draft | 物語全文表示モーダル | Function は Panel |
| `.facility-badge` | Draft | 施設バッジの固有種別 | Function は FacilityBadge |
| `.how-to-play-screen` | Draft | How To Play 画面のルート | 画面固有CSSのスコープ起点 |
| `.how-to-play-slide` | Draft | How To Play の各ページ | 背景画像・遷移の対象 |
| `.diagram-area` | Draft | 図解・canvas を含む説明領域 | How To Play、説明用UI |

## 9. Domain Color Types
施設やアイテムカテゴリは、色や意味の伝播に使う type として登録する。
具体的な色値は tokens 側に置き、ここでは class の用途だけを定義する。

| Class | Status | 用途 |
| :--- | :--- | :--- |
| `.trading-post` | Draft | 交易所 |
| `.repair-dock` | Draft | 修理ドック |
| `.black-market` | Draft | 闇市 |
| `.home` | Draft | ホーム、拠点 |
| `.chassis` | Draft | シャーシカテゴリ |
| `.logic` | Draft | ロジックカテゴリ |
| `.launcher` | Draft | ランチャーカテゴリ |
| `.module` | Draft | モジュールカテゴリ |
| `.booster` | Draft | ブースターカテゴリ |
| `.cargo` | Draft | 貨物カテゴリ |
| `.rocket` | Draft | ロケットカテゴリ |

## 10. Screen-Specific Boundary
次の class は画面固有スタイルで定義する。共通スタイルへ昇格する場合は、この台帳へ追加する。

| Prefix / Class | 用途 | 備考 |
| :--- | :--- | :--- |
| `.how-to-play-*` | How To Play 固有の配置、背景、ページ遷移 | ゲーム中 tutorial とは分ける |
| `.trade-*` | 施設取引固有の配置 | 施設共通へ昇格する場合は Function 化する |
| `.report-*` | 航行結果固有の表示 | リプレイや記録と共通化できるものだけ昇格 |
| `.hud-*` | 航行 HUD 固有の配置 | 航行画面内に閉じる |
| `.log-*` | 印刷物風カード内の細部 | AchievementCard と共通化できるものだけ昇格 |

## 11. Definition Timing
新しい共通 class は、次のどちらかのタイミングでこの台帳へ追加する。

- 仕様書で複数画面から同じ責務で参照されることが分かったとき。
- 実装前に、画面固有 class ではなく共通部品として切り出す判断をしたとき。

単一画面だけで必要な class は、まず画面仕様に定義する。
後から複数画面で同じ用途が確認できた場合に、名称と責務を整理してこの台帳へ昇格する。
