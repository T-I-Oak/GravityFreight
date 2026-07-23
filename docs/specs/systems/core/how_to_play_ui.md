# Specification: HowToPlayUI Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 説明書画面コントローラー。
- **責務**:
    - 説明書画面の表示、非表示、ページ遷移を制御する。
    - how-to-play コンテンツデータを DOM へ描画する。
    - ページに応じて `HowToPlayDiagrams` のデモを開始、停止する。
    - How To Play の7ページ構成を現行 UI 構造で表示する。

## 2. 命名境界

- この仕様で扱う機能名は **How To Play** とする。
- `Tutorial` は、将来実装する「ゲーム中に遊び方を伝える機能」の名称として予約する。
- `Tutorial` はゲーム中チュートリアル用の名称として予約し、説明書画面の正式仕様・実装では `HowToPlay` 系の名称を使用する。

## 3. コンテンツ構成

説明書は以下の 7 ページ構成とする。

| No. | ページ | 目的 |
| :--- | :--- | :--- |
| 1 | MISSION | 世界観、任務、ゲームオーバー条件の概要を伝える |
| 2 | CORE LOOP | ASSEMBLE / LAUNCH / NAVIGATION / DELIVERY の基本循環を伝える |
| 3 | ASSEMBLE | ロケット建造の操作概要を伝える |
| 4 | LAUNCH | ロケット、発射台、ブースター選択と発射方向の概要を伝える |
| 5 | NAVIGATION | 自動航行、荷物回収、出口到達、失敗条件の概要を伝える |
| 6 | DELIVERY | 出口到達後の施設と配送ボーナスの概要を伝える |
| 7 | STRATEGY | 母星帰還、再始動ボーナス、銀河密度上昇リスクの概要を伝える |

- ページ本文、見出し、表示ブロックは承認済みコンテンツを使用し、独自にゲームルールを追加しない。
- `public/assets/tutorial/slide1.png` から `slide7.png` は、各ページの背景画像として使用する。
- 実装時のアセットパス名に `tutorial` が残る場合でも、クラス名・仕様名・UI 機能名は How To Play として扱う。

## 4. インターフェース (Interface)

### `constructor(dependencies: object)`

以下の依存を受け取る。

- `rootElement: HTMLElement`: 説明書画面またはオーバーレイのルート要素。
- `gameDataRepository: GameDataRepository`: how-to-play コンテンツ、アイテム表示用データ、施設名、カラーなどの取得窓口。
- `uiComponents: UIComponents`: アイテムカードなど共通 UI 断片の生成窓口。
- `diagrams: HowToPlayDiagrams`: 説明書内デモの制御担当。

### `initialize(): void`

- ルート要素、ページ表示領域、ナビゲーションボタン、ドットナビゲーション、閉じるボタンを取得する。
- 必須 DOM が不足している場合は初期化エラーを投げる。
- イベント登録は初期化時に一度だけ行う。

### `show(): void`

- how-to-play 画面を表示する。
- 表示開始時は常に 1 ページ目を選択する。
- `GameDataRepository` から取得したコンテンツを現在言語で解決済みのデータとして受け取り、ページを描画する。
- 表示後、現在ページに対応するデモを開始する。

### `hide(): void`

- `HowToPlayDiagrams.stopAll()` を呼び出す。
- how-to-play 画面を非表示にする。
- 現在ページ、アニメーション中フラグ、遷移待ち状態を初期化する。

### `goToPage(index: number): void`

- 指定ページへ移動する。
- ページ移動前に `HowToPlayDiagrams.stopAll()` を呼び出す。
- ページ番号が範囲外の場合は何も変更しない。
- 遷移完了後、移動先ページに対応するデモを開始する。

### `nextPage(): void`

- 現在ページの次へ移動する。
- 最終ページでは状態を変更しない。

### `previousPage(): void`

- 現在ページの前へ移動する。
- 先頭ページでは状態を変更しない。

### `refreshLanguage(): void`

- 言語変更後、現在ページ番号を維持してコンテンツを再取得・再描画する。
- 再描画前後で `HowToPlayDiagrams.stopAll()` を呼び出し、古い DOM や canvas に紐付いたアニメーションを残さない。

## 5. 描画仕様

- スライドデータは `title`, `background`, `layout`, `blocks` を持つ構造として扱う。
- `background` はページ番号に対応する背景画像を指定し、1 ページにつき 1 枚の背景画像を画面全体に表示する。
- `layout` は 1 カラムまたは 2 カラムを表せること。
- `blocks` は、説明文、補足、リスト、カード、ボタン、canvas プレースホルダーを表せること。
- アイテムカードは `Item#getViewData()` など通常画面と同じ view data を作成し、`UIComponents.generateCardHTML` で表示する。
- 説明用であっても、カード風の独自 HTML を作成して ItemCard を模倣してはならない。
- 組み立て済みロケットのカードを表示する場合は、説明用の生データではなく `Item` と `RocketItem` から生成した view data を使う。
- How To Play の通常カード表示では `state-compact` を強制しない。コンパクト表示が必要な場合は、ゲーム本編で同じ表示状態が使われていることを確認してから採用する。
- 組み立てデモの選択表現は、外側の説明用ラッパーではなく `UIComponents.generateCardHTML` が生成した `.ItemCard` に `state-selected` を付与して表現する。
- how-to-play 用 HTML 文字列を描画する場合でも、外部入力ではなくプロジェクト内の静的コンテンツのみを対象とする。
- ボタン、ドット、ページ移動などの操作 UI は、現行 UI コンポーネント規約に合わせる。

## 6. ページ切り替えアニメーション

- ページ切り替えは、現在ページのフェードアウト、背景トラック移動、移動先ページのフェードインで構成する。
- 遷移中は現在ページの本文をフェードアウトし、背景トラックを左右へ移動し、移動先ページの本文をフェードインする。
- タイトルと本文ブロックは同時に表示せず、タイトル、本文ブロックの順に段階的に表示する。
- アニメーション中は連続入力による多重遷移を防止する。
- 遷移開始前に `HowToPlayDiagrams.stopAll()` を呼び出し、遷移完了後に移動先ページのデモを開始する。

## 7. i18n 方針

- how-to-play 文言は共通 i18n ライブラリで解決可能な静的コンテンツとして管理する。
- `HowToPlayUI` は解決済みの表示データを受け取り、`lang-store` や `{ v, d }` などの内部構造へ直接依存しない。
- 言語変更時の再描画は `refreshLanguage()` で扱う。
- `localStorage` へ直接アクセスしない。永続化が必要になった場合は、共通 `DataManager` の `getSavedData` / `setSavedData` を使う所有クラスを経由する。

## 8. CSS 方針

- CSS は画面責務と共通スタイル規約に従って定義する。
- how-to-play 画面のスタイルは、現行 UI 階層とコンポーネント規約に合わせる。
- クラス名は `how-to-play-*` または同等の専用スコープを持つ命名に統一し、将来の `tutorial-*` 機能と衝突させない。
- ページ背景、本文ブロック、補足ブロック、カード表示、canvas 領域、ページナビゲーションは、責務単位で CSS を分けられる構造にする。

## 9. デモ連携

ページごとのデモ開始は `HowToPlayUI` が判断し、描画・タイマー管理は `HowToPlayDiagrams` に委譲する。

| ページ | デモ |
| :--- | :--- |
| ASSEMBLE | カード選択と建造ボタンの疑似操作 |
| LAUNCH | 発射角度、選択構成、予測軌道の短いループ |
| NAVIGATION | 重力航行、航跡、出口到達の短いループ |

- ページ移動、非表示、言語再描画の前には必ず `HowToPlayDiagrams.stopAll()` を呼び出す。
- `HowToPlayUI` はデモ内部の物理計算や canvas 描画を直接実装しない。
- LAUNCH / NAVIGATION の canvas デモは、本編と同じ `SectorMapRenderer` / `FlightVisualRenderer` を利用して描画する。
- 説明用のダミーデータを使う場合でも、予測線、ロケット、航跡、回収アイテム、ソナーなどを個別に独自描画してはならない。
- デモに渡す対象も、手作りの描画用オブジェクトではなく `Sector.fromSnapshot()`、`Item`、`RocketItem`、`Rocket` などのゲーム本体のエンティティを使用する。
