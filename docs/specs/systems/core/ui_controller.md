# Specification: UIController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 表示管理。
- **責務**: 画面遷移、ダイアログ表示の制御、HUDの制御。

## 2. インターフェース (Interface)

- **`showTitleScreen(): void`**
    - タイトル画面を表示する。
- **`showSectorStartScreen(): void`**
    - セクター開始画面（ワープ演出）を表示する。
- **`showArchiveScreen(): void`**
    - アーカイブ画面を表示する。
- **`showTutorialScreen(): void`**
    - 説明書（チュートリアル）画面を表示する。
