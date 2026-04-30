# Specification: CameraController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: カメラ制御。
- **責務**:
    - 追従対象（Rocket等）へのフォーカス。
    - ズーム、揺れ（Shake）演出の制御。

## 2. インターフェース (Interface)

- **`setZoomRate(value: number): void`**
    - マップの表示倍率を設定する。
