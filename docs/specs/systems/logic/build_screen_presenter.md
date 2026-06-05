# Specification: BuildScreenPresenter Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: Game Lifecycle
- **役割**: ビルド画面表示用 view data の生成。
- **責務**:
    - `SessionState.inventory` と現在のビルド選択状態から、ビルド画面の各リスト表示データを生成する。
    - ビルド画面の空表示文言、発射ボタン文言を `GameDataRepository.getUiText()` から取得する。
    - ランチャー使用回数など、表示上の disabled 判定に必要な最小限の状態を view data に反映する。
- **責務外**:
    - DOM の生成・更新は `UIController` の責務。
    - 選択状態の更新、RocketItem の組み立て、発射処理は `GameController` の責務。
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
        - `selection`: 現在選択中の stack uid。キーは `rocket`, `launcher`, `booster`, `chassis`, `logic`, `module`。
    - **出力**:
        - `sections`: `rocket`, `launcher`, `booster`, `chassis`, `logic`, `module` の各表示セクション。
        - `launch`: 発射ボタンの状態と表示文言。

## 3. BuildScreenViewData

```js
{
  sections: {
    [category]: {
      entries: BuildEntryViewData[],
      emptyText: string,
      emptySubtext: string
    }
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
  disabled: boolean
}
```

## 4. 表示ルール

- 各カテゴリの `entries` は `sessionState.inventory.getItemsByCategory(category)` の結果から生成する。
- `itemViewData` は stack の `getViewData()` を使用する。
- `selected` は `selection[category] === stack.uid` で判定する。
- `launcher` は `maxCharges > 0` かつ `charges <= 0` の場合、選択不可として `disabled: true` にする。
- `launch.ready` は `rocket` と `launcher` が選択されている場合に `true` とする。
- UI 文言は `content_ui.json` の `build.*` 配下から取得する。
