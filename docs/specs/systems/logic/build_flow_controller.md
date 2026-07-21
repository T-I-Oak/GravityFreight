# Specification: BuildFlowController Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: ビルド画面の選択状態と再描画の仲介。
- **責務**:
    - ビルド画面で現在選択されている stack uid をカテゴリ別に保持する。
    - カテゴリごとの選択上限と stack 所持数に基づき、選択数の増加、切り替え、リセットを管理する。
    - `module` カテゴリについては、スロット数をカテゴリ上限として扱い、複数・重複選択を管理する。
    - ASSEMBLY タブの選択状態から `RocketItem` を生成し、inventory へ追加する。
    - UI から受け取った `{ category, uid }` を選択状態へ反映する。
    - `BuildScreenPresenter` に view data 生成を委譲する。
    - ビルドフェーズ開始など画面全体の表示切替が必要な場合のみ、生成した view data を `UIController.showBuildScreen()` へ渡す。
- **責務外**:
    - inventory から表示データを抽出する処理は `BuildScreenPresenter` の責務。
    - スロット値や item 表示データの算出は各 item / `BuildScreenPresenter` の責務。
    - DOM イベントの購読は `UIController` の責務。
    - 発射、航行開始、FLIGHT タブの発射構成消費は `GameController` または今後の専用クラスの責務。

## 2. インターフェース (Interface)

- **`constructor({ sessionState, uiController, buildScreenPresenter })`**
    - ビルド表示に必要な依存を保持する。
    - 必須依存が不足している場合は初期化エラーを投げる。

- **`handleItemSelection(selection: { category: string, uid: string }): BuildScreenViewData`**
    - 指定カテゴリの選択状態を更新する。
    - カテゴリ選択上限は、`module` は選択中パーツから算出される総スロット数、その他カテゴリは `1` とする。
    - 対象 stack の選択数が stack 所持数未満、かつカテゴリ選択数がカテゴリ上限未満の場合、対象 stack の選択数を `+1` する。
    - 対象 stack が未選択、かつカテゴリ選択数がカテゴリ上限に達している場合、カテゴリ内の選択履歴 top を `1` 個減らし、対象 stack の選択数を `+1` する。
    - 上記以外の場合、対象 stack の選択数を `0` にリセットする。
    - `module` でスロットを持つ item を選択した場合、そのスロット増加分は即座にカテゴリ上限へ反映する。
    - chassis / logic の切り替えや module 選択数のリセットによって総スロット数が不足した場合、あふれた module は最後に選択されたものから順に自動解除する。
    - 更新後の最新 view data を返す。
    - このメソッドは `UIController.showBuildScreen()` を呼び出さない。呼び出すと現在のタブ状態を初期化してしまうため、選択操作の再描画は呼び出し元 view が返却された view data を使って現在の表示状態のまま行う。

- **`showBuildScreen(): BuildScreenViewData`**
    - 現在の `currentBuildSelection` を使って `BuildScreenPresenter.createViewData()` を呼び出す。
    - 生成した view data を `UIController.showBuildScreen()` に渡す。
    - 生成した view data を返す。

- **`assembleRocket(): RocketItem`**
    - `chassis` と `logic` が選択されていない場合はエラーを投げる。
    - 選択中の `chassis`, `logic`, `module` を inventory stack から取り出す。
    - 取り出したパーツから `RocketItem` を生成し、inventory へ追加する。
    - ASSEMBLY タブの選択状態をリセットし、最新 inventory でビルド画面を再描画する。
    - 生成した `RocketItem` を返す。

- **`resetFlightSelection(): void`**
    - FLIGHT タブの選択状態 (`rocket`, `launcher`, `booster`) を解除する。
    - **責務境界**: inventory からの抽出、耐久度消費、航行開始は行わない。発射処理で消費が完了した後、`GameController` から呼び出される。

## 3. 状態 (State)

- **`currentBuildSelection: object`**
    - `rocket`, `launcher`, `booster`, `chassis`, `logic` は inventory stack の `uid` を値として保持する。
    - `module` は `uid` ごとの選択数を保持する。
    - module のカテゴリ上限処理と自動解除順を安定させるため、module 選択履歴を保持する。
