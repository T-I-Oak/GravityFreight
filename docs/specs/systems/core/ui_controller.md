# Specification: UIController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 表示管理。
- **責務**: 画面遷移、ダイアログ表示の制御、HUDの制御。

## 2. インターフェース (Interface)

- **`showScreen(screenId: string): void`**
    - 指定された ID に対応する画面（またはコンテキスト）を表示し、それ以外の画面を非表示にする。
