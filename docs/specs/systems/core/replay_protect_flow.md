# Specification: ReplayProtectFlow Class

## 1. 役割と責務

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: リプレイ保護操作の共通フロー。
- **責務**:
    - 航行結果画面と Archive Replays タブから呼ばれる replay protect 操作を共通化する。
    - protect 設定要求を、呼び出し元に応じて即時更新または保護対象編集モーダルへ振り分ける。
    - 航行結果画面では、既存 protected replay 件数に関わらず、現在の航行結果を含めた保護対象編集モーダルを表示する。
    - Archive Replays タブでは、画面内で自由に protect / unprotect できるため、6件目の protect は保存せず、上限到達結果を呼び出し元へ返す。
    - 航行結果画面のモーダルでは、先頭に今回の航行結果を表示し、保存済み replay record 全件を続けて表示する。
    - 航行結果画面のモーダルで表示する `NEW` バッジは、Archive Replays タブと同じ date-cell 構造とスタイル規約を使用する。日時または `CURRENT FLIGHT` のラベルが長い場合はラベル側を省略し、`NEW` バッジを右寄せで維持する。
    - 表示順はスコア降順、同点の場合は新しい記録を上位とする。今回の航行結果も同じ基準で並べ、現在どの順位相当か判断できるようにする。
    - `No.` 欄は、今回の航行結果では `CURRENT` と表示する。
    - 保存済み replay record の `No.` 欄は、Archive Replays タブと同じソート規則で付与した2桁の表示番号を表示する。
    - `No.` は永続データではなく、画面表示用に生成する値として扱う。
    - モーダル内の protect 選択数が最大5件以内になるようにユーザーが選択する。
    - OK 確定時、既存 protected replay のうち選択解除されたものを先に unprotect し、その後に今回の航行結果の protect 状態を保存する。
    - キャンセルされた場合は今回の航行結果を protect せず、失敗結果を呼び出し元へ返す。
    - モーダルは、呼び出し元画面の横に並べず、画面中央に表示する。
    - 候補テーブルは Archive Replays タブと同様に `Well` 内へ配置し、行数が多い場合はテーブル本体をスクロールする。
    - 候補は record id ではなく、整形済み日時、到達セクター、スコアなど、ユーザーが識別できる航行記録情報で表示する。
    - 未 protected replay も候補テーブルから省略しない。Archive Replays タブと同じ一覧感で確認できることを優先する。
    - モーダル表示中は背面の航行結果画面を操作できないよう、全画面の modal layer で入力を遮断する。

## 2. インターフェース

- **`setCommitHandler(handler: (request) => FlightRecord | null): void`**
    - 実際の favorite 更新を行う handler を登録する。
    - handler は `source`, `recordId`, `favorite`, `replaceRecordId` を含む request を受け取る。

- **`setRecordsProvider(provider: () => FlightRecord[]): void`**
    - 現在の保存済み replay record 一覧の取得元を登録する。
    - 5件上限判定と解除候補表示に使用する。

- **`request(options): ReplayProtectResult`**
    - `options.source` は `archive` または `result` を指定する。
    - `options.recordId` は操作対象の replay record id を指定する。
    - `options.source === 'result'` かつ `options.favorite === true` かつ `options.forceDialog === true` の場合は、保護対象編集モーダルを表示し、`{ status: 'pending', success: false }` を返す。
    - 上記以外で `options.favorite` が `false` の場合は確認なしで commit する。
    - 上記以外で `options.favorite` が `true` かつ protected replay が 5 件未満の場合は確認なしで commit する。
    - `options.favorite` が `true` かつ protected replay が 5 件あり、操作対象が未 protected の場合:
        - `options.source === 'result'` では保護対象編集モーダルを表示し、`{ status: 'pending', success: false }` を返す。
        - `options.source === 'archive'` では保存せず、`{ status: 'limit', success: false }` を返す。

## 3. 戻り値

```javascript
{
  status: 'updated' | 'pending' | 'canceled' | 'limit',
  success: boolean,
  recordId: string | null,
  favorite: boolean,
  record?: FlightRecord | null,
  releasedRecordId?: string,
  releasedRecord?: FlightRecord | null
}
```

- `updated`: favorite 更新が完了した。
- `pending`: 航行結果画面で保護対象編集モーダルを表示し、ユーザー選択待ち。
- `canceled`: 保護対象編集モーダルがキャンセルされ、操作対象は protect されなかった。
- `limit`: Archive Replays タブで 6 件目の protect が要求された。保存は行われず、呼び出し元は上限到達メッセージを表示する。

## 4. 責務境界

- `ReplayProtectFlow` は 5件上限、航行結果画面の保護対象編集 UI、Archive Replays タブの上限到達結果を担当する。
- `FlightRecorder` は指定された record の favorite 値更新と永続化だけを担当し、5件上限や置き換え判断を担当しない。
- 呼び出し元画面は `ReplayProtectResult` を見て表示状態を更新する。保存前に見た目だけを変更してはならない。
- 呼び出し元画面は保護対象候補の文字列を個別生成しない。候補表示の情報構造とラベルは `ReplayProtectFlow` が共通管理する。
