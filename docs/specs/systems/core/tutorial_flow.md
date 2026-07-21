# Specification: Tutorial Flow

## 1. 役割と責務

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: ゲーム中 tutorial のシナリオ定義と共通 `TutorialManager` 連携。
- **責務**:
    - GameWorks OAK 共通ライブラリの `TutorialManager` を使用し、ゲーム中の状況に応じた tutorial 表示を制御する。
    - Tutorial の進捗 state を永続化し、完了済みシナリオを再表示しない。
    - ハイライト対象 DOM またはゲーム内オブジェクトの矩形計算を Gravity Freight 側で提供する。
    - Tutorial 完了後にゲーム操作を再開する。

## 2. 命名境界

- **How To Play** はタイトルメニューから開く説明書画面を指す。
- **Tutorial** はゲーム中に、到達した状態に応じて遊び方を伝える機能を指す。
- How To Play の `how-to-play-*` class、背景画像、ページ遷移仕様を Tutorial に流用しない。

## 3. 共通 TutorialManager 仕様の利用

- `TutorialManager` は共通ライブラリから直接 import して使用する。
- `TutorialManager` へ渡す進捗 state は共通ライブラリが定義する opaque な値として扱う。
- Gravity Freight 側は state の内部構造を参照・加工しない。
- `checkTrigger(triggerName, context)` は未完了で、trigger と `requires` を満たす最初の scenario を表示する。
- `requires` は scenario の分岐と合流に使用する。
    - 未指定の場合、直前の表示 scenario 完了を要求する。
    - `[]` の場合、依存なしで発火可能にする。
    - `["id-a", "id-b"]` の場合、指定 scenario がすべて完了している場合だけ発火可能にする。

## 4. コンテンツ方針

- Tutorial の説明内容は How To Play を情報源とする。
- Tutorial 用の文言は、表示タイミングとハイライト対象に合わせて短く見直す。
- How To Play の全文や背景画像をそのまま表示するのではなく、到達中のゲーム画面上で必要な要点だけを提示する。
- Tutorial 専用の文言は i18n resource として管理し、ゲームロジックや DOM に直書きしない。

## 5. Gravity Freight の tutorial 構成

記録画面には tutorial を表示しない。

| Scenario id | Trigger | 明示 requires | How To Play 対応 | 目的 |
| :--- | :--- | :--- | :--- | :--- |
| `build-intro` | `buildScreen` | `[]` | CORE LOOP | ロケットを飛ばして出口に到達させるゲーム目的を案内する |
| `build-assembly-tab` | `buildScreen` | 省略 | ASSEMBLE | ロケット建造のために ASSEMBLY タブを選択することを案内する |
| `build-assembly-select` | `assemblyTabReady` | 省略 | ASSEMBLE | chassis / logic / module 選択と ASSEMBLE 操作を案内する |
| `build-flight-select` | `flightTabReady` | 省略 | LAUNCH | rocket / launcher / booster 選択を案内する |
| `aim` | `aimStart` | 省略 | LAUNCH / NAVIGATION / STRATEGY | AIM 状態で予測線、発射方向、航行結果、発射操作を案内する |
| `facility-trading-post` | `facilityTradingPost` | `aim` | DELIVERY | Trading Post の紹介後、item 売買を案内する |
| `facility-repair-dock` | `facilityRepairDock` | `aim` | DELIVERY / STRATEGY | Repair Dock の紹介後、修理、分解、回復を案内する |
| `facility-black-market` | `facilityBlackMarket` | `aim` | DELIVERY / STRATEGY | Black Market の紹介後、特殊購入と恒久リスクを案内する |

一本道部分の `requires` は省略し、共通 `TutorialManager` の暗黙 requires に任せる。
明示 `requires` は分岐や合流など、保守上必要な箇所だけに使用する。
施設 tutorial は `aim` 完了後に分岐する。施設 tutorial 同士に順序依存は持たせない。

## 6. 表示タイミング

- `build-intro`: ビルドパネルが開き、選択操作を受け付ける状態で trigger を通知する。
- `build-assembly-tab`: `build-intro` 完了後、同じ `buildScreen` trigger の連続シナリオとして表示する。
    - ASSEMBLY タブを開く前に、`tab-button-assembly` をハイライトして選択を促す。
- `build-assembly-select`: ASSEMBLY タブ内のインベントリ一覧と ASSEMBLE ボタンが表示された時点で trigger を通知する。
- `build-flight-select`: FLIGHT タブに戻り、発射準備用のインベントリ一覧が表示された時点で trigger を通知する。
- `aim`: ロケットと発射台が選択され、AIM 状態に入った時点で表示する。
- `facility-*`: 各施設画面を表示した時点で trigger を通知する。

アプリ側は上記タイミングで trigger を通知するだけで、初回表示か、完了済みか、リセット後に再表示すべきかの判定は共通 `TutorialManager` に委譲する。

## 7. Tutorial reset

- 設定モーダルには tutorial reset 操作を追加する。
- Reset 操作は共通 `TutorialManager` の reset API へ委譲し、Gravity Freight 側で進捗 state の中身を直接変更しない。
- 設定モーダル表示中は tutorial trigger を発火しない。
- ビルド中に設定モーダルから reset した場合も、reset 操作直後に `buildScreen` trigger を通知しない。
    - 設定モーダル背面で tutorial が開始されると、ユーザーが表示内容を確認できないため。
- 設定モーダルを閉じた時点で、ビルド中であれば `buildScreen` trigger を再判定する。
    - reset 後の tutorial は、ユーザーが設定モーダルを閉じて確認できる状態になってから開始する。
- 施設画面で設定モーダルから reset した場合は、その場では facility tutorial を開始しない。
    - 次にビルド画面へ戻ったとき、通常のビルド開始 trigger により `build-intro` から再開する。

## 8. ハイライト設計

### 8.1 スタイル方針

- UI 要素のハイライトは `shape: "rect"` を基本とする。
- Canvas 上の天体、ロケット、item など丸い対象は `shape: "circle"` または `shape: "ellipse"` を使用する。
- 複数の一覧をまとめて示す場合は、各一覧全体を `rect` で囲う。
- 余白は対象に応じて指定し、必要以上に広い領域をハイライトしない。
- 角丸 UI 要素を囲う場合は `radius` を指定し、ボタンやカードの外形と大きくずれないようにする。
- ハイライト中は画面全体に暗い mask を置き、対象領域だけを読みやすく抜く。
- 対象枠は cyan 系の細い outline と弱い glow を基本とし、施設固有色や item category 色が意味を持つ場合は対象自身の色を維持する。
- 操作を促すページでは対象枠に控えめな pulse を付ける。説明だけのページでは pulse しない。

| 用途 | shape | padding | radius | 備考 |
| :--- | :--- | :--- | :--- | :--- |
| タブ、ボタン | `rect` | `{ x: 8, y: 6 }` | `12` | タップ対象であることが分かる程度に外側を囲う |
| item list / section | `rect` | `{ x: 10, y: 8 }` | `8` | 一覧全体を対象にする |
| map canvas 全体 | `rect` | `{ x: 0, y: 0 }` | `0` | 操作領域全体を示す |
| Canvas 上の rocket / star / item | `circle` | `{ x: 12, y: 12 }` | - | `TutorialFlowController.onCalculateRect()` で画面矩形を返す |
| exit arc | `ellipse` | `{ x: 10, y: 10 }` | - | Canvas 内オブジェクトとして矩形計算する |

### 8.2 ハイライト対象

固定 DOM 要素は tutorial 用に安定した `id` を付け、`elementId` で指定する。
Canvas 上の対象は DOM ではないため、`targetType` を使い、`TutorialFlowController.onCalculateRect()` が Canvas 座標変換で解決する。

| Target spec | 対象 | 計算方法 |
| :--- | :--- | :--- |
| `elementId: "inventory-panel"` | ビルドパネル全体 | DOM |
| `elementId: "tab-button-assembly"` | ASSEMBLY タブ | DOM |
| `elementId: "tab-button-flight"` | FLIGHT タブ | DOM |
| `elementId: "assembly-inventory-list"` | ASSEMBLY タブ内のインベントリ一覧 | DOM |
| `elementId: "flight-inventory-list"` | FLIGHT タブ内のインベントリ一覧 | DOM |
| `elementId: "build-btn"` | ASSEMBLE ボタン | DOM |
| `elementId: "launch-btn"` | LAUNCH ボタン | DOM |
| `elementId: "gameCanvas"` | マップ操作領域 | DOM |
| `targetType: "aim-preview-rocket"` | AIM 中の preview rocket | Canvas world-to-screen |
| `targetType: "prediction-line"` | 予測線 | Canvas world-to-screen |
| `targetType: "hover-star"` | hover 対象の天体 | Canvas world-to-screen |
| `targetType: "exit-arc"` | exit arc | Canvas world-to-screen |
| `targetType: "home-star"` | 母星 | Canvas world-to-screen |
| `elementId: "facility-section-sell"` | Trading Post の売却セクション | DOM |
| `elementId: "facility-section-buy"` | Trading Post の購入セクション | DOM |
| `elementId: "facility-section-repair"` | Repair Dock の発射台メンテナンス | DOM |
| `elementId: "facility-section-dismantle"` | Repair Dock の分解 | DOM |
| `elementId: "facility-section-received"` | Repair Dock の強化済み parts 表示 | DOM |
| `elementId: "facility-section-black-market"` | Black Market の購入 | DOM |
| `elementId: "facility-section-acquired"` | Black Market の獲得 item 表示 | DOM |
| `elementId: "facility-header"` | 施設名、施設説明の領域 | DOM |
| `elementId: "facility-depart-button"` | 施設出発ボタン | DOM |

### 8.3 Canvas 対象のカメラ制御

Canvas 上の対象をハイライトする場合は、現在の camera 位置に依存せず、tutorial 用の camera focus 演出を挟む。

1. map の pan / zoom / rotate / AIM drag を無効化する。
2. 現在の camera 状態を記憶する。
3. `TutorialFlowController` が対象の world 座標範囲を計算する。
4. 対象を画面中央付近に大きめに表示できる camera 状態を算出する。
5. 現在の camera 状態から tutorial 用 camera 状態へスムーズに遷移する。
6. 遷移完了後、対象矩形を再計算して tutorial mask / tooltip へ制御を渡す。
7. tutorial ページ終了後、記憶していた camera 状態へスムーズに戻す。
8. map の pan / zoom / rotate / AIM drag を元の入力状態へ戻す。

- この camera focus は tutorial 用の一時演出であり、ユーザー操作として永続化しない。
- 対象範囲を解決できない場合は、必須データ欠落として例外にする。画面を暗くするだけの fallback は行わない。
- Camera focus 中と tutorial 表示中は、Tutorial の OK / Next / Close など tutorial 操作だけを受け付ける。
- Canvas 対象の矩形は、tutorial 用 camera 状態への遷移後に再計算してから mask に渡す。

### 8.4 共通 TutorialManager 連携

Canvas 対象の camera focus は、Gravity Freight 側だけで `checkTrigger()` や Next ボタンを横取りして実装しない。
理由は、共通 `TutorialManager` が scenario 開始、page 切替、scenario 完了、reset、mask / tooltip 表示を所有しており、アプリ側で外側から包むと進行制御と非同期順序制御が二重化するためである。

- 表示前に camera focus を完了してから mask / tooltip を表示する順序制御。
- 複数ページ scenario で、各 page の highlight に応じて focus を切り替える制御。
- 最終 page 完了後と reset 時に、保存済み camera 状態ではなく tutorial 開始前の一時状態へ戻す制御。
- Next / OK ボタン押下中の二重進行防止、ボタン disable、mask 更新ループの開始 / 停止制御。

#### 8.4.1 表示ライフサイクル hook

`TutorialManager` options の lifecycle hook を使用し、scenario 開始、page 表示、page 非表示、scenario 完了の順序を共通側に委譲する。

```ts
type TutorialLifecycleContext = {
  scenario: object;
  page: object;
  scenarioIndex: number;
  pageIndex: number;
  highlights: object[];
};

type TutorialManagerOptions = {
  onBeforeScenario?: (context: TutorialLifecycleContext) => void | Promise<void>;
  onBeforeShowPage?: (context: TutorialLifecycleContext) => void | Promise<void>;
  onAfterShowPage?: (context: TutorialLifecycleContext) => void | Promise<void>;
  onBeforeHidePage?: (context: TutorialLifecycleContext) => void | Promise<void>;
  onAfterHidePage?: (context: TutorialLifecycleContext) => void | Promise<void>;
  onAfterScenario?: (context: TutorialLifecycleContext) => void | Promise<void>;
};
```

- `onBeforeScenario` は scenario 開始時、最初の page を表示する前に呼ばれる。
- `onBeforeShowPage` は mask / tooltip を表示する前に呼ばれる。
- `onBeforeShowPage` が Promise を返した場合、解決後に `showTooltip()` と `resizeMask()` を実行する。
- `onBeforeShowPage` 中に例外が発生した場合は、異常を隠蔽せず throw する。
- `onBeforeHidePage` は page 非表示前、`onAfterHidePage` は page 非表示後に呼ばれる。
- `onAfterScenario` は scenario 完了後に呼ばれる。
- hook は `await Promise.resolve(hook(context))` で扱い、同期 / 非同期の違いをアプリ側の呼び出しコードへ露出させない。
- hook 未指定時は従来通り表示し、既存利用側との互換を維持する。

管理制御モードでの順序は以下とする。

1. `onBeforeScenario`
2. `onBeforeShowPage`
3. mask / tooltip 表示
4. `onAfterShowPage`
5. OK / Next ボタンクリック
6. `onBeforeHidePage`
7. mask / tooltip 削除
8. `onAfterHidePage`
9. 次 page がある場合は `onBeforeShowPage` へ進む
10. scenario が完了した場合は `onAfterScenario`

Gravity Freight では、Canvas 対象の camera focus は `onBeforeShowPage` で行い、scenario 終了時の camera 復元と入力ロック解除は `onAfterScenario` で行う。
これにより、最終 page の tooltip / mask が消える前に camera が復元される表示順序を避ける。
Canvas highlight がない page へ進む場合は、前 page が消えた後の `onBeforeShowPage` で camera だけを復元し、scenario 中の入力ロックは維持する。

#### 8.4.2 Next / OK ボタン制御

`TutorialManager` options に Next / OK ボタンを指定できる selector を追加し、指定された場合は共通側がクリック制御を所有する。

```ts
type TutorialManagerOptions = {
  nextButtonSelector?: string;
};
```

- `nextButtonSelector` が指定された場合、`TutorialManager` は初期化時に対象 button へ handler を1回だけ登録する。
- 登録 handler は共通側の内部進行処理を呼び、`onBeforeHidePage`、次 page の `onBeforeShowPage`、scenario 終了時の `onAfterScenario` を必要に応じて await する。
- 非同期進行中は二重クリックを防ぐため、共通側が進行中フラグを持ち、button を一時的に disabled にする。
- このモードでは、Gravity Freight 側は `advanceScenario()` を直接呼ばない。
- `advanceScenario()` は手動制御モード用の互換 API として残す。`nextButtonSelector` 使用中に外部から呼ばれた場合は、二重進行を避けるため例外にする。
- 共通側が Next / OK を所有することで、将来 hook が非同期化しても Gravity Freight 側の click handler を変更しなくてよい。

#### 8.4.3 共通側が持たない責務

共通 `TutorialManager` は、camera focus のための world bounds / focus bounds を計算しない。
共通側が取得できる highlight の screen rect は、現在の camera 状態で投影された結果であり、zoom / pan を決める入力としては使用しない。

共通側が担当するのは以下に限定する。

- page 表示前後の hook を呼ぶ。
- Next / OK のクリック進行を所有する。
- hook の Promise を待ってから mask / tooltip を表示する。
- mask / tooltip 表示時に従来通り `onCalculateRect()` で screen rect を取得する。

#### 8.4.4 Gravity Freight 側の受け皿

Gravity Freight 側には `TutorialCameraFocusController` を追加する。

- 入力:
    - page 内 highlight 群。
    - `CameraController` 現在状態。
    - map canvas の CSS / backing store サイズ。
    - tooltip layout hint。
- 出力:
    - 一時 camera state `{ position, rotation, zoomLevel }`。
- 責務:
    - Canvas highlight が含まれる page のみ focus を行う。
    - `targetType` を Gravity Freight の world object として解釈し、対象の world bounds / focus bounds を計算する。
    - 複数 Canvas highlight がある場合、すべての world bounds を含む focus bounds を作る。
    - focus bounds が画面内に収まる zoom / pan を計算する。
    - 必要に応じて tooltip が置かれる予定領域を避ける safe area を使う。
    - 最初の camera focus 直前に tutorial 開始前の camera state を保存する。
    - 複数 page 間で tutorial 用 camera state が変化しても、保存済み camera state は上書きしない。
    - Canvas highlight がない page へ進む場合、保存済み camera state があれば復元する。
    - scenario 完了 / reset 時に保存済み camera state があれば復元し、復元後に保存値を破棄する。
    - camera state の保存は行わない。
    - map 入力を一時停止し、復元時に元の入力状態へ戻す。

#### 8.4.5 移行方針

共通 `TutorialManager` の拡張は、全アプリを一度に移行しなくてもよいよう後方互換を維持して導入する。

1. 共通ライブラリを後方互換ありで拡張する。
    - `nextButtonSelector` 未指定時は従来通り、利用側が Next / OK ボタン handler を登録し、`advanceScenario()` を直接呼ぶ。
    - `nextButtonSelector` 指定時は新方式として、共通側が Next / OK ボタン handler と進行制御を所有する。
    - 既存アプリはライブラリを最新化してもコード変更なしで従来通り動作する。
2. 各アプリを新仕様へ順次移行する。
    - `nextButtonSelector` を指定する。
    - アプリ側の Next / OK ボタン handler を削除する。
    - アプリ側から `advanceScenario()` を直接呼ばない。
    - 必要に応じて `onBeforeScenario` / `onBeforeShowPage` / `onBeforeHidePage` / `onAfterScenario` などの hook を設定する。
3. 全アプリの移行完了後、共通ライブラリから手動 Next 制御用の互換コードを削除する。
    - `advanceScenario()` の外部公開を終了する、または内部専用 API にする。
    - selector / hook ベースの制御を標準仕様にする。
4. 互換コード削除後の共通ライブラリを各アプリへ反映する。
    - 各アプリは既に新仕様対応済みであるため、反映時の追加修正は最小限にする。

## 9. ページ設計

各 scenario は 1〜3 ページ程度に分割する。
1ページでは、1つのハイライト対象と1つの説明意図だけを扱う。

| Scenario id | Page intent | Highlight | Style |
| :--- | :--- | :--- | :--- |
| `build-intro` | ロケットを飛ばして出口に到達させることが目的である | `gameCanvas` / `exit-arc` | canvas: rect + ellipse |
| `build-assembly-tab` | ロケットを作るために ASSEMBLY タブを選択する | `tab-button-assembly` | rect / tab / pulse |
| `build-assembly-select` | chassis と logic を1つずつ選択する | `assembly-inventory-list` | rect / list |
| `build-assembly-select` | slot 数まで module を追加搭載できる | `assembly-inventory-list` | rect / list |
| `build-assembly-select` | ASSEMBLE ROCKET ボタンで rocket を建造する | `build-btn` | rect / button / pulse |
| `build-flight-select` | rocket と launcher を1つずつ選択する | `flight-inventory-list` | rect / list |
| `build-flight-select` | booster を1つ選択できる | `flight-inventory-list` | rect / list |
| `aim` | 航路予測を見て発射方向を調整する | `aim-preview-rocket`, `prediction-line` | circle / ellipse |
| `aim` | 3か所の出口 arc のいずれかに到達すると sector clear になる | `exit-arc`, `hover-star`, `home-star` | ellipse + circle |
| `aim` | 星にある item を確認し、近くを通過すると自動回収できる | `hover-star`, `home-star`, `exit-arc` | circle + ellipse |
| `aim` | item を回収した rocket が出口 arc に到達すると item を入手できる | `exit-arc`, `hover-star`, `home-star` | ellipse + circle |
| `aim` | 星への激突や出口以外からの領域外脱出で item / rocket を失う | `hover-star`, `home-star`, `exit-arc` | circle + ellipse |
| `aim` | 母星に帰還すると item を入手し、同一 sector 内で return bonus が発生する | `home-star`, `exit-arc`, `hover-star` | circle + ellipse |
| `aim` | LAUNCH ボタンで発射する | `launch-btn` | rect / button / pulse |
| `facility-trading-post` | Trading Post でできることを紹介する | `facility-header` | rect / panel header |
| `facility-trading-post` | 様々な商品と sale item の存在を案内する | `facility-section-buy` | rect / section |
| `facility-trading-post` | 不要 item の売却と売り過ぎへの注意を案内する | `facility-section-sell` | rect / section |
| `facility-repair-dock` | Repair Dock でできることを紹介する | `facility-header` | rect / panel header |
| `facility-repair-dock` | launcher charge を回復する | `facility-section-repair` | rect / section |
| `facility-repair-dock` | rocket 分解、parts 強化、価格上昇を案内する | `facility-section-dismantle` | rect / section |
| `facility-repair-dock` | 分解で得た強化済み parts の表示先を案内する | `facility-section-received` | rect / section |
| `facility-black-market` | Black Market でできることを紹介する | `facility-header` | rect / panel header |
| `facility-black-market` | 通常取引 / プレミアム取引のどちらか1つを購入できることを案内する | `facility-section-black-market` | rect / section |
| `facility-black-market` | 購入結果を確認する | `facility-section-acquired` | rect / section |
| `facility-black-market` | 利用後は以降の sector の星が増える | `facility-depart-button` | rect / button |

## 10. 保存

- Tutorial 進捗は共通 `DataManager` 経由で保存する。
- localStorage へ直接アクセスしない。
- 保存 key と schema は `GameDataRepository` 側に定義する。
- 保存データは共通 `TutorialManager` から受け取った state をそのまま保持し、アプリ側で中身を解釈しない。

## 11. 依存と委譲

- `TutorialManager`
    - 進行制御、tooltip 表示、マスク描画を担当する。
- `TutorialFlowController`
    - scenario 定義、trigger 呼び出し、opaque な進捗 state の入出力、Gravity Freight 固有の矩形計算を担当する。
- `UIController`
    - Tutorial 必須 DOM の提供と、tooltip / mask が他 UI と重なるための表示レイヤーを担当する。
- `GameController`
    - ゲーム状態の節目で tutorial trigger を呼ぶ。

## 12. 実装上の注意

- Tutorial 中は、基本的に tutorial 操作だけを受け付ける。
- 不明点や仕様判断が必要な点は、推測で補完せず Owner に確認する。
- ハイライト対象が存在しない場合は必須データ欠落として扱い、fallback 表示で隠蔽しない。
