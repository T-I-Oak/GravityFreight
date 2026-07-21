# Specification: SoundController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: 音響管理。
- **責務**:
    - 効果音（SE）および環境音の再生制御。
    - 音量設定の管理と永続化への反映（GameDataRepository との連携）。
    - セクター遷移時等の特殊なサウンド演出（フェードイン・アウト等）の実行。

## 2. インターフェース (Interface)

### プロパティ (Properties)
- **`seVolume: number`**: 
    - 効果音のマスターボリューム（0.0 〜 1.0）。

### メソッド (Methods)

- **`initialize(): void`**
    - `GameDataRepository.getSavedSEVolume(migrationMap)` を実行し、保存されている音量を自身に適用する。
    - `migrationMap` の `init` では、デフォルト音量（例：0.5）を返す。

- **`playSE(id: string, volume?: number): void`**
    - 指定された ID の効果音を一度だけ再生する。
    - `volume` が指定された場合、それは **絶対音量（0.0 〜 1.0）** として扱われ、マスターボリューム設定を無視して再生される（主に音量設定時のプレビューに使用）。
    - `volume` が省略された場合は、現在のマスターボリューム（`seVolume`）を適用する。

- **`getSEVolume(): number`**
    - 現在のマスターボリューム（0.0 〜 1.0）を返す。

- **`setSEVolume(volume: number): void`**
    - マスターボリュームを更新し、`GameDataRepository.setSavedSEVolume(data)` を通じて永続化する。

- **`startWarpEffect(fadeInDuration: number, options?: { direction?: 'forward' | 'reverse' }): void`**
    - ワープ演出用のループSE（ホワイトノイズ等）の再生を開始する。
    - `fadeInDuration`（秒）をかけて、音量を 0 からマスターボリューム設定値まで滑らかに上昇させる。
    - ワープ音はホワイトノイズを lowpass filter へ通し、開始時に 100Hz から 5000Hz へスイープすることで加速感を表現する。
    - 音響上の立ち上がりは演出時間より短く制御し、視覚演出が長い場合でもワープ音の存在を早く認識できるようにする。
    - `direction === 'reverse'` の場合は、停止指示が遅れても鳴り続けないよう、音響上の立ち上がり後から長めの自然フェードアウトと停止を予約する。

- **`stopWarpEffect(fadeOutDuration: number): void`**
    - 再生中のワープ音を停止する。
    - `fadeOutDuration`（秒）をかけて、音量を 0 まで下げてから完全に停止する。
    - 通常ワープでも急に途切れて聞こえないよう、短すぎる `fadeOutDuration` は最小フェード時間まで延長する。
    - 通常ワープは約5秒の最小フェード時間で減衰させ、短い演出でも急に途切れないようにする。
    - 逆ワープは通常ワープより長いフェードアウトで減衰させる。
    - 停止時は filter を 100Hz へ戻しながら音量を下げ、音量が下がった後に source を停止する。

## 3. サウンド ID と使用箇所

### 3.1 SE

| ID | 用途 | 使用箇所 |
| --- | --- | --- |
| `click` | 通常の UI 決定音。 | タイトルメニュー、ビルドパネルのプレースホルダー、ビルドパネルのアイテム選択、ASSEMBLE / LAUNCH、航行結果画面のボタンと protect 操作、施設画面の出発、Archive / 設定 / ゲームオーバー画面のボタン。 |
| `select` | 音量プレビュー用の確認音。通常 UI 操作には使用しない。 | 設定画面の SE 音量プレビュー。 |
| `cashier` | コインの授受を伴う施設操作音。低い短音を2回鳴らし、最後に金属的な短いノイズを重ねて「ガチャ、ガチャ、カシャン」の印象にする。 | 施設画面の購入、売却、修理、分解、Black Market 取引。 |
| `flight-exit` | 出口 arc 到達の航行終了音。低めの4音コードでゴール到達を表現する。 | 航行結果 `cleared` 確定時。 |
| `flight-return` | 母星帰還の航行終了音。 | 航行結果 `returned` 確定時。 |
| `flight-crash` | 星衝突の航行終了音。 | 航行結果 `crashed` 確定時。 |
| `flight-lost` | 境界外ロストの航行終了音。 | 航行結果 `lost` 確定時。 |
| `stamp` | 評価スタンプの押印音。低域中心の重い打撃音として鳴らす。 | ゲームオーバー画面の grade stamp 表示時。 |

### 3.2 環境音

- ワープ演出音は一度きりの SE ではなく環境音として扱う。
- セクター開始 / 逆ワープなどのワープ演出音は、`WorldRenderer.startWarpEffect()` / `WorldRenderer.stopWarpEffect()` から呼び出される。
- `SectorTransitionAnimator` や `SectorProgressionController` はワープ音を直接操作しない。背景・マップ・音響の同期は `WorldRenderer` の責務とする。
- ワープ音は、ホワイトノイズを帯域フィルターで変化させる成分のみで構成する。開始時はフェードインし、停止時はフィルターを戻しながらフェードアウトして停止する。
- 通常ワープも逆ワープに近い質感とし、停止時は通常ワープ用の短めの自然減衰で音量と filter を下げる。
- 逆ワープ音はゲームオーバー演出の表示タイミングにより停止指示が遅れる可能性があるため、開始時点で長めに減衰して自然停止する予約を持つ。
