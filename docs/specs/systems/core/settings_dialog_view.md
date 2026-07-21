# SettingsDialogView 仕様書

## 1. 役割
`SettingsDialogView` は設定オーバーレイの表示、非表示、設定 UI の操作イベント接続を担当する。
設定値そのものの保存や適用ロジックは担当しない。

- SE 音量の適用と保存は `SoundController` と `GameDataRepository` に委譲する。
- カメラ状態の初期化と保存は `CameraController` と `GameDataRepository` に委譲する。
- 言語設定の保存、同期、アクティブ言語解決は GameWorks OAK 共通 i18n ライブラリに委譲する。

## 2. 表示導線
- `#title-settings-btn` または `#build-settings-btn` を押すと `#settings-overlay` を表示する。
- `#settings-done-btn` を押すと `#settings-overlay` を非表示にする。
- 表示時は `onOpen`、非表示時は `onClose` を通知し、呼び出し元が tutorial trigger の一時停止、再開、再判定を行えるようにする。
- 設定値は操作時に即時反映・保存されるため、キャンセル操作は持たない。
- タイトル画面とゲーム中 UI から開く場合も、同じ `#settings-overlay` を使用する。
- 操作音や共通 UI feedback は、`UIController.setOperationHandler()` から渡される `operationBinder` に委譲する。

## 3. インターフェース
- **`initialize(): void`**
    - 開閉ボタンを `operationBinder` 経由で接続する。
- **`configure(config: object): void`**
    - `seVolume` を UI に反映し、音量スライダー、カメラリセットボタン、言語セレクターを接続する。
    - `onOpen()`、`onClose()`、`onSEVolumeChange(volume)`、`onCameraReset()`、`setupLanguageSelector(select, supportedLangs, onChange)`、`onLanguageChange(lang)` は外部から渡される。
    - 保存、音声再生、カメラ状態変更、言語保存は渡されたハンドラ側の責務とする。

## 4. 設定項目

### 4.1 SE 音量
- UI は `#se-volume-slider` を使用する。
- UI 表示値は `0` から `100` の整数とし、内部値は `0.0` から `1.0` の数値に変換する。
- 値の変更時は `SoundController.setSEVolume(volume)` を呼び、`GameDataRepository.setSavedSEVolume()` を通じて保存する。
- スライダー操作のプレビュー音は `SoundController.playSE('select', volume)` を使用し、現在の保存済み音量ではなくスライダー上の絶対音量で鳴らす。

### 4.2 カメラリセット
- UI は camera reset 用の明示的なボタンを持つ。
- 押下時は `CameraController` の状態を初期値へ戻し、直後に保存する。
- 初期値は `CameraController` のデフォルト状態と同一とする。
    - `position: { x: 0, y: 0 }`
    - `rotation: 0`
    - `zoomLevel: 1`
- リセットは現在表示中のマップに即時反映する。
- カメラリセットは言語設定や音量設定に影響しない。

### 4.3 言語切り替え
- UI は言語選択用の `<select>` を持つ。
- Gravity Freight がサポートする言語は `ja` と `en` とする。
- 初期化には共通 i18n ライブラリの `setupLanguageSelector(selectorOrElement, supportedLangs, onChangeCallback)` を使用する。
- 言語の保存キー、未対応言語からのアクティブ言語解決、他タブ同期は共通 i18n ライブラリの責務とする。
- 言語変更時は、静的マスタデータと UI テキストを現在言語で再取得し、現在表示中の画面を再描画する。
- Gravity Freight 側で `localStorage` へ直接アクセスして言語を保存してはならない。

## 5. UI 更新範囲
言語変更時に再描画する対象は、表示中の画面に限定する。

- タイトル画面: タイトルメニュー、設定画面、メタデータ表示。
- How To Play: 現在ページを維持して本文と図解ラベルを再描画する。
- プレイ画面: HUD、ビルドパネル、施設画面、航行結果画面など現在表示中の UI。
- Archive: 現在タブを維持してラベル、テーブル見出し、カード表示を再描画する。
- Story Modal: 現在開いている story を維持して再描画する。

## 6. 非責務
- `SettingsDialogView` は音声再生、カメラ行列計算、言語リソース展開を直接行わない。
- `SettingsDialogView` は `{ v, d }` など共通 DataManager の保存内部構造を扱わない。
- `SettingsDialogView` は `localStorage` へ直接アクセスしない。

## 7. 受け入れ条件
- タイトル画面とビルドパネルから設定オーバーレイを開閉できる。
- SE 音量を変更すると、保存値と画面表示値が一致する。
- カメラリセットを実行すると、カメラ状態が初期値に戻り保存される。
- 言語を切り替えると、共通 i18n ライブラリ経由で保存され、表示中の UI が現在言語で再描画される。
