# Specification: SoundController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 音響演出管理。
- **責務**:
    - SE（効果音）および BGM の再生。
    - ボリューム設定の管理。

## 2. インターフェース (Interface)

### 2.1 ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `DataManager` から永続化されている設定値（音量等）を取得し、自身に適用する。

### 2.2 ボリューム制御 (Volume Control)
- **`setSEVolume(value: number): void`**
    - SE（効果音）の音量を設定する（0.0 - 1.0）。
- **`getSEVolume(): number`**
    - 現在の SE 音量を返す。

### 2.2 再生制御 (Playback)
- **`playSE(id: string, volume?: number): void`**
    - 指定された ID の効果音を再生する。
    - `volume`（0.0 - 1.0）が指定された場合はその音量で、指定がない場合は現在のグローバル設定値で再生する。
