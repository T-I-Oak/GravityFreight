# Specification: UIController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 表示管理。
- **責務**: 
    - 画面遷移、ダイアログ表示の制御、HUDの制御。
    - UI操作に伴うフィードバック音（決定音等）の再生制御。
    - **DOM イベントの仲介**: HTML 要素のイベント（click等）を購読し、演出を付与した上でシステム側のコールバックを実行する。

## 2. インターフェース (Interface)

### 共通基盤メソッド (Core Infrastructure)

- **`constructor()`**
    - **内部挙動**:
        1. HTML ドキュメント内から各画面のコンテナ要素や、主要なボタン（開始ボタン、開閉ボタン等）を検索し、内部変数に保持する。
        2. **安全性**: 必要な要素が見つからない場合は、初期化エラー（Error）を投げ、不具合を即座に顕在化させる。

- **`setOperationHandler(element: HTMLElement, handler: Function, seId: string = 'click'): void`**
    - 指定された要素にクリックイベントを登録し、指定された操作音を再生した後にハンドラを実行する。
    - **内部挙動**: `addEventListener('click', ...)` を実行し、クリック時に `SoundController.playSE(seId)` を再生してから `handler()` を呼び出す。

- **`setSelectionHandler(element: HTMLElement, dataKey: string, handler: (value: string) => void, seId: string = 'select'): void`**
    - データ属性（`data-XXX`）の取得を伴うクリックイベントを登録する（アイテム選択用）。
    - **内部挙動**: クリック時に `SoundController.playSE(seId)` を再生し、`element.dataset[dataKey]` を引数として `handler` を実行する。

- **`setResizeHandler(handler: (width: number, height: number) => void): void`**
    - ウィンドウのリサイズイベントが発生した際のコールバックを登録する（操作音なし）。
    - **内部挙動**: `window` の `resize` イベントを購読し、発生時に現在のウィンドウサイズを引数として `handler` を実行する。

### 画面制御メソッド (Screen Control)

- **`showTitleScreen(): void`**
    - タイトル画面を表示する。
- **`showSectorStartScreen(): void`**
    - セクター開始画面を表示する。
- **`showRecordScreen(): void`**
    - 記録画面を表示する。
- **`showManualScreen(): void`**
    - 説明書（マニュアル）画面を表示する。
- **`showBuildScreen(): void`**
    - ビルド画面を表示する。
    - **内部挙動**: 画面の切り替えと同時に `openBuildPanel()` を呼び出し、初期状態でパネルが開いた状態にする（この際、操作音は鳴らさない）。
- **`showSectorTitle(sectorNumber: number, isAnomaly: boolean): void`**
    - セクター開始時のタイトル演出（「SECTOR X」）を画面中央に表示する。
- **`showNavigationScreen(): void`**
    - 航行画面（SCR-NAV）へ遷移し、HUD を表示する。
    - **内部挙動**: 他の画面要素（ビルド画面等）を隠し、HUD 要素の表示状態（`.hide` クラスの除去等）を切り替える。
- **`initHUD(initialData: object): void`**
    - 契約（ゲーム）開始時に HUD を初期化し、表示を開始する。
    - **内部挙動**: `SessionState` から渡された初期値（スコア、セクター等）を各カウンターにセットする。
- **`updateHUDValue(key: string, value: number): void`**
    - 航行画面が表示されている間、HUD 内の特定の数値（スコア等）を更新する。
- **`updateMailStatus(type: string, isUnread: boolean): void`**
    - メールアイコンの状態（種類に応じた色、未読時の明滅演出）を更新する。
- **`setMailHandler(handler: Function): void`**
    - メールアイコンがクリックされた際のハンドラを登録する。
- **`showStoryModal(content: object): void`**
    - ストーリー閲覧用のモーダルウィンドウを表示する。
- **`showResultScreen(resultData: FlightResultData): void`**
    - 航行結果表示画面へ遷移する。

### ビルドパネル制御 (Build Panel Control)

- **`openBuildPanel(): void`**
    - ビルドパネルを開く。
    - **内部挙動**: パネル要素に特定の CSS クラス（`.is-open` 等）を付与し、アニメーションを実行する。
- **`closeBuildPanel(): void`**
    - ビルドパネルを閉じる。
    - **内部挙動**: パネル要素から CSS クラスを除去し、アニメーションを実行する。
- **`toggleBuildPanel(): void`**
    - ビルドパネルの表示/非表示を切り替える。
    - **内部挙動**: 内部で保持するパネルの表示フラグ（isOpen）を確認し、`openBuildPanel()` または `closeBuildPanel()` のいずれかを呼び出す。


### イベント登録メソッド (Event Registration)

- **`setStartHandler(handler: Function): void`**
    - タイトル画面の「開始ボタン」にハンドラを登録する。
    - **内部挙動**: 内部で保持する開始ボタン要素を引数として `setOperationHandler` を呼び出す。
- **`setRecordHandler(handler: Function): void`**
    - タイトル画面の「記録ボタン」にハンドラを登録する。
    - **内部挙動**: 内部で保持する記録ボタン要素を引数として `setOperationHandler` を呼び出す。
- **`setManualHandler(handler: Function): void`**
    - タイトル画面の「説明書ボタン」にハンドラを登録する。
    - **内部挙動**: 内部で保持する説明書ボタン要素を引数として `setOperationHandler` を呼び出す。
- **`setBuildPanelHandler(handler: Function): void`**
    - ビルドパネルの「開閉ボタン」にハンドラを登録する。
    - **内部挙動**: 開閉ボタン要素を引数として `setOperationHandler` を呼び出す。

- **`setVolumeHandler(handler: (value: number) => void): void`**
    - 設定画面の音量スライダー操作時のハンドラを登録する。
    - **内部挙動**: **シナリオ 1.4** にて定義される、専用のスライダー制御ロジック（音響演出を含む）を介して登録を行う。

- **`setItemSelectionHandler(handler: (uid: string) => void): void`**
    - ビルドパネル内のアイテム要素が選択された際のハンドラを登録する。
    - **内部挙動**: 各アイテム要素（`.item-card` 等）に対し、`setSelectionHandler(element, 'uid', handler)` を呼び出す。

- **`setAssembleHandler(handler: Function): void`**
    - ビルドパネルの「ASSEMBLE ボタン」にハンドラを登録する。
    - **内部挙動**: ASSEMBLE ボタン要素を引数として `setOperationHandler` を呼び出す。

- **`setLaunchHandler(handler: Function): void`**
    - ビルド画面の「LAUNCH ボタン」にハンドラを登録する。
    - **内部挙動**: LAUNCH ボタン要素を引数として `setOperationHandler` を呼び出す。

- **`setCanvasInputHandler(handler: (event: PointerEvent | WheelEvent) => void): void`**
    - マップ描画領域（Canvas）に対する入力を中継する（操作音なし）。
    - **内部挙動**: 描画コンテナに対するポインター/ホイールイベントを直接購読し、演出音を介さずに `handler` を実行する。
    - **注記**: 対象となる Canvas 要素の取得方法は、`WorldRenderer` の初期化仕様に準拠する。
