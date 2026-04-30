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

- **`constructor()`**
    - **挙動**:
        - HTML ドキュメント内から各画面のコンテナ要素や、インタラクションの対象となる主要なボタン（開始ボタン等）を検索し、内部変数に保持する。
        - 必要な要素が見つからない場合は、初期化エラーを投げる。

- **`showTitleScreen(): void`**
    - タイトル画面を表示する。
- **`showSectorStartScreen(): void`**
    - セクター開始画面を表示する。
- **`showArchiveScreen(): void`**
    - アーカイブ画面を表示する。
- **`showTutorialScreen(): void`**
    - 説明書（チュートリアル）画面を表示する。
- **`setStartHandler(handler: Function): void`**
    - タイトル画面の「開始ボタン」がクリックされた際のコールバックを登録する。
    - **内部挙動**: 
        1. 内部で保持する開始ボタン要素（DOM）の `click` イベントに、自身のラッパーメソッドを登録する。
        2. クリック発生時、ラッパーメソッド内で `SoundController.playSE()` を呼び出した後、引数で渡された `handler` を実行する。
- **`setArchiveHandler(handler: Function): void`**
    - タイトル画面の「アーカイブボタン」がクリックされた際のコールバックを登録する。
    - **内部挙動**: 開始ボタンと同様に、SE 再生後に引数の `handler` を実行する。
- **`setTutorialHandler(handler: Function): void`**
    - タイトル画面の「説明書ボタン」がクリックされた際のコールバックを登録する。
    - **内部挙動**: 開始ボタンと同様に、SE 再生後に引数の `handler` を実行する。
