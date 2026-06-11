# Specification: BuildScreenPresenter Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: ビルド画面表示用 view data の生成。
- **責務**:
    - `SessionState.inventory` と現在のビルド選択状態から、ビルド画面の各リスト表示データを生成する。
    - ビルド画面の空表示文言、ASSEMBLE ボタン文言、発射ボタン文言を `GameDataRepository.getUiText()` から取得する。
    - ランチャー使用回数など、表示上の disabled 判定に必要な最小限の状態を view data に反映する。
- **責務外**:
    - DOM の生成・更新は `UIController` の責務。
    - 選択状態の更新、RocketItem の組み立て、発射処理は `BuildFlowController` / `GameController` の責務。
    - inventory の変更や item 消費は `SessionState` / 各ドメインクラスの責務。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`constructor(gameDataRepository: GameDataRepository)`**
    - UI resource を取得するための `GameDataRepository` を保持する。
    - `gameDataRepository` が渡されない場合は初期化エラーを投げる。

- **`createViewData(sessionState: SessionState, selection?: object): BuildScreenViewData`**
    - 現在の inventory と選択状態からビルド画面表示用データを生成する。
    - **入力**:
        - `sessionState`: 現在の契約状態。`inventory.getItemsByCategory(category)` を使用する。
        - `selection`: 現在のビルド選択状態。
            - `rocket`, `launcher`, `booster`, `chassis`, `logic`: 選択中 stack uid。
            - `module`: stack uid ごとの選択数。
    - **出力**:
        - `sections`: `rocket`, `launcher`, `booster`, `chassis`, `logic`, `module` の各表示セクション。
        - `assembly`: ASSEMBLE ボタンの状態と表示文言。
        - `launch`: 発射ボタンの状態と表示文言。

## 3. BuildScreenViewData

```js
{
  sections: {
    [category]: {
      entries: BuildEntryViewData[],
      emptyText: string,
      emptySubtext: string,
      emptyAction?: string,
      emptyNotable?: boolean
    }
  },
  assembly: {
    ready: boolean,
    label: string,
    subtext: string
  },
  launch: {
    ready: boolean,
    label: string,
    subtext: string
  }
}
```

### BuildEntryViewData

```js
{
  uid: string,
  item: Item,
  itemViewData: object,
  selected: boolean,
  selectedCount: number,
  disabled: boolean
}
```

## 4. 表示ルール

- 各カテゴリの `entries` は `sessionState.inventory.getItemsByCategory(category)` の結果を代表 item の `uid` 昇順に並べて生成する。inventory 内の挿入順や発射装備の一時的な取り出し・戻しによって表示順が変わらないようにする。
- `itemViewData` は stack の `getViewData()` を使用する。
- `rocket` カテゴリの `entries` が空の場合のみ、空表示に `emptyAction: 'open-assembly'` と `emptyNotable: true` を付与し、ASSEMBLY タブへ誘導する special placeholder として表示する。
- `rocket`, `launcher`, `booster`, `chassis`, `logic` の `selected` は `selection[category] === stack.uid` で判定する。
- `module` の `selected` は `selection.module[stack.uid] > 0` で判定し、`selectedCount` にその選択数を設定する。
- `module` はクリック超過時に `BuildFlowController` が対象 stack の選択数を `0` にリセットするため、スロット上限や stack 所持数超過を理由に `disabled` へしない。
- `launcher` は `maxCharges > 0` かつ `charges <= 0` の場合、選択不可として `disabled: true` にする。
- `assembly.ready` は `chassis` と `logic` が選択されている場合に `true` とする。
- `launch.ready` は `rocket` と `launcher` が選択されている場合に `true` とする。
- UI 文言は `content_ui.json` の `build.*` 配下から取得する。
