# Specification: UIController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 表示管理。
- **責務**: 画面遷移、ダイアログ表示の制御、HUDの制御。

## 2. インターフェース (Interface)

- **`showTitleScreen(): void`**
    - タイトル画面を表示する。
- **`setStartHandler(handler: Function): void`**
    - タイトル画面の「開始ボタン」がクリックされた際のコールバックを登録する。
