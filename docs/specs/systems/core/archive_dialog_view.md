# Specification: ArchiveDialogView Class

## 1. 役割と責務

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: Analytic Archive overlay の表示制御。
- **責務**:
    - タイトル画面の RECORDS ボタンに open handler を登録する。
    - `ArchiveComponents.generateHTML(viewData)` の結果を `#archive-screen-root` へ反映する。
    - Archive overlay の表示・非表示を制御する。
    - Archive 内のタブ切替と close button を配線する。
    - Replays タブの行選択状態を管理し、選択されたリプレイ記録 ID を再生開始ハンドラへ通知する。
    - Replays タブの protect 操作を、選択状態とは独立して `ReplayProtectFlow` へ通知する。
    - Story タブの既読 story card 操作を、ストーリー表示ハンドラへ通知する。

## 2. 責務境界

- Archive 表示用 view data の生成は `ArchiveScreenPresenter` が担当する。
- HTML の詳細構築は `ArchiveComponents` が担当する。
- 操作音などの共通 UI フィードバックは `UIController.setOperationHandler()` から渡される binder に委譲する。
- リプレイ再生本体、リプレイ snapshot 復元、画面遷移、保護状態の永続更新など、永続データやゲーム状態に影響する操作は担当しない。
- protect の5件上限判定は `ReplayProtectFlow` が担当する。
- Archive Replays タブでは、既存の一覧上で protect / unprotect を自由に操作できるため、5件上限到達時に置き換えモーダルは表示しない。
- 6件目の protect が要求された場合、`ArchiveDialogView` は `ReplayProtectFlow` の戻り値に基づいて上限到達メッセージを表示し、対象の星を ON にしない。

## 3. インターフェース

- **`constructor(options: object)`**
    - `document` と `operationBinder` を受け取る。
    - `operationBinder` が未指定の場合は初期化エラーを投げる。

- **`initialize(): void`**
    - Archive overlay を非表示状態にする。

- **`hide(): void`**
    - Archive overlay を非表示状態にする。
    - リプレイ再生開始など、Archive 以外の画面へ遷移する処理から呼び出される。

- **`getState(): { visible: boolean, activeTab: string | null }`**
    - Archive overlay が表示中かどうかと、現在 active なタブ ID を返す。
    - 非表示時は `{ visible: false, activeTab: null }` を返す。
    - 表示中で active tab が解決できない場合は `analytics` を返す。
    - 言語切り替え時に `AppOrchestrator` が同じタブで Archive を再描画するために使用する。

- **`setOpenHandler(handler: Function): void`**
    - `#archive-btn` のクリック操作を登録する。

- **`setReplayStartHandler(handler: (recordId: string) => void): void`**
    - Replays タブの `PLAY REPLAY` 操作時に呼び出すハンドラを登録する。
    - ハンドラには、現在選択中のリプレイ記録 ID を渡す。

- **`setStoryOpenHandler(handler: (storyId: string) => void): void`**
    - Story タブの既読 story card 操作時に呼び出すハンドラを登録する。
    - ハンドラには、クリックされたカードの `data-story-id` を渡す。
    - 未読 story card は `data-story-id` を持たず、handler 呼び出し対象にしない。

- **`show(viewData: ArchiveViewData, components: object, options?: { activeTab?: string }): void`**
    - Archive HTML を生成して表示する。
    - `data-tab` を持つタブを配線し、`options.activeTab` が指定されている場合はそのタブを初期表示にする。
    - `options.activeTab` が未指定の場合は `analytics` を初期表示にする。
    - `.archive-close-button` のクリックで overlay を閉じる。
    - Replays タブでは、リプレイ行が選択されるまで `PLAY REPLAY` を disabled とする。
    - リプレイ行の選択時は選択行に `state-active` を付与し、他の行を `state-inactive` に戻す。
    - protect 操作時は `ReplayProtectFlow.request()` の戻り値に基づいて星アイコンの `state-active` / `state-inactive` を更新する。
    - protect 上限到達時は対象の星を即時 ON にせず、先に他の保護を解除する必要があることを Archive overlay 上部の一時通知で表示する。
    - protect 更新後は保持している replay row 状態を scan し直し、全 star 表示を同期する。
    - Story タブでは既読 story card のみ操作可能にし、操作時は `setStoryOpenHandler()` で登録された handler へ story ID を渡す。
