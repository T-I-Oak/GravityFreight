# Specification: SoundController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 音響管理。
- **責務**:
    - 効果音（SE）および環境音の再生制御。
    - 音量設定の管理と永続化への反映（DataManager との連携）。
    - セクター遷移時等の特殊なサウンド演出（フェードイン・アウト等）の実行。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`seVolume: number`**: 
    - 効果音のマスターボリューム（0.0 〜 1.0）。

### メソッド (Methods)

- **`initialize(): void`**
    - `DataManager.getSEVolume()` を実行し、保存されている音量を自身に適用する。

- **`playSE(id: string, volume?: number): void`**
    - 指定された ID の効果音を一度だけ再生する。
    - `volume` が指定された場合は、マスターボリュームに乗算して適用する。

- **`getSEVolume(): number`**
    - 現在のマスターボリューム（0.0 〜 1.0）を返す。

- **`setSEVolume(volume: number): void`**
    - マスターボリュームを更新し、`DataManager.setSEVolume()` を通じて永続化する。

- **`playWarpSound(fadeInDuration: number): void`**
    - ワープ演出用のループSE（ホワイトノイズ等）の再生を開始する。
    - `fadeInDuration`（秒）をかけて、音量を 0 からマスターボリューム設定値まで滑らかに上昇させる。

- **`stopWarpSound(fadeOutDuration: number): void`**
    - 再生中のワープ音を停止する。
    - `fadeOutDuration`（秒）をかけて、音量を 0 まで下げてから完全に停止する。
