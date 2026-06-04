# Specification: StorySystem Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 物語（Story）の選択・永続進捗管理。
- **責務**:
    - ストーリーIDごとの永続的な既読状態（isRead）の管理。
    - 条件に応じたストーリーIDの選出。
    - 既読フラグの更新と永続化。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `GameDataRepository` から保存された進捗データを取得し、自身の内部状態を初期化する。
    - **内部実装詳細**:
        1. `MigrationMap`（GameDataRepository 仕様参照）を定義する。
           - `init()` はデフォルトの `StoryProgressData` を返す。
        2. `GameDataRepository.getSavedStoryProgress(migrationMap)` を呼び出す。
        3. 取得したデータの `readMessageIds` を `Set<string>` に変換し、内部変数 `readIds` に保持する。
        4. **マスタデータの解析**: 物語データ（`content.json`）の全キーを取得し、実在するストーリーIDの集合（`masterIds`）を `Set<string>` として生成・保持する。
        5. セッション変数 `history` を `""` に初期化する。

#### GameDataRepository との連携シーケンス
1. `StorySystem.initialize()`
2. 　→ `GameDataRepository.getSavedStoryProgress(migrationMap)`
3. 　　→ GameDataRepository 内部で共通 DataManager にデータ取得・マイグレーションを委譲
4. 　← 復元された `StoryProgressData` オブジェクトを返す
5. `StorySystem` が内部状態を更新

### 状態管理 (State Management)
- **`isRead(storyId: string, deep: boolean = false): boolean`**
    - 指定されたストーリーIDが既読かどうかを返す。
    - **`deep: false` (デフォルト)**: 
        - 指定された ID に対するピンポイントの既読チェック。
    - **`deep: true`**: 
        - 指定された `storyId` をプレフィックス（前方一致）として持つ、**すべての実在するストーリーID（`masterIds`）**をスキャンする。
        - 該当する全 ID が既読であれば `true` を返し、一つでも未読（`readMessageIds` に未存在）があれば `false` を返す。
        - **用途**: 出口（ExitArc）の段ボールアイコンの明滅に使用。その先に一つでも未読ルートがあれば明滅させる。

- **`updateReadStatus(storyId: string): void`**
    - 指定されたストーリーIDを既読としてマークし、最新の状態を `GameDataRepository.setSavedStoryProgress(data)` を通じて永続化する。
    - すでに既読の場合は保存を行わない。

- **`unlockNextStep(branchType: string): void`**
    - 指定された系列（'T', 'R', 'B'）への配送成功に基づき、次のストーリーを解放する。
    - **内部挙動**:
        1. **ガード**: 現在の `history` 文字列の長さがすでに 3 の場合は、更新を行わず終了する。
        2. 現在の `history` 文字列（例: `"T"`) の末尾に `branchType` を連結し、新しい ID（例: `"TR"`) を生成する。
        3. 生成された ID を `history` にセットし、`GameDataRepository.setSavedStoryProgress(data)` で保存する。

- **`getStoryStatus(): Array<object>`**
    - 全 3 スロットの状態（進行履歴、種類、既読フラグ）を一括で取得する。
    - **内部挙動**:
        - セッション履歴（`history`）の各ステップに対応する ID を抽出する（例: `"TR"` → `["T", "TR"]`）。
        - 各 ID の末尾 1 文字を系列（`type`）として抽出する。
        - 各 ID が `readMessageIds`（全プレイ累計）に含まれているか確認する。
    - **戻り値**: `[{ id: string, type: string, isUnread: boolean }, ...]` 形式の配列（最大 3 要素）。
        - `type`: ストーリー ID の最後の文字（'T', 'R', 'B'）。UI でのアイコン色決定に使用。
        - `isUnread`: `readMessageIds` に含まれていない場合 `true`。この時 UI で明滅が継続される。

- **`getMessageData(storyId: string): object`**
    - `GameDataRepository.getStoryContent(storyId)` から、指定されたストーリーIDに対応する表示用ストーリーデータを引いて返す。
    - 本文の言語展開は共通 i18n ライブラリと `GameDataRepository` 側のデータロードに委譲し、`StorySystem` は言語切り替え処理を持たない。
    - **戻り値**: `{ id: string, title: string, discovery: string, body: string, type: string }` 形式。
        - `type`: ID の最後の文字（系列識別子）。

- **`getReadCounts(): object`**
    - 既読済みストーリー数を、実績判定用の集計値として返す。
    - **戻り値**: `{ total: number, T: number, R: number, B: number }` 形式。
        - `total`: 実在するストーリーIDのうち、既読済みの総数。
        - `T` / `R` / `B`: `readMessageIds` のうち、ストーリーIDの先頭文字が対象系列に一致する件数。

- **`getStoryProgressData(): StoryProgressData`**
    - 現在の永続化対象データを返す。
    - 呼び出し側が保存するための API ではなく、テストや一時確認で内部状態を直接参照しないための明示メソッドとする。

- **`resetSession(): void`**
    - セッション変数 `history` を `""` に戻す。
    - タイトル画面へ戻るなど、現在プレイ中の配送履歴を破棄するタイミングで呼び出す。

## 3. 内部状態とデータ構造 (State & Data Structures)

### 内部状態 (Instance Properties / Memory only)
- **`history`**: `string` (現在のゲーム内での配送履歴。例: `"TR"`)。タイトル画面に戻るたびに `""` にリセットされる。
- **`readIds`**: `Set<string>` (累計既読IDの集合)。検索効率化のため初期化時に作成。
- **`masterIds`**: `Set<string>` (全ストーリーIDの集合)。`content.json` のキーから生成。

### StoryProgressData (永続化対象)
- **役割**: `GameDataRepository` を通じて保存されるデータ構造。
```javascript
{
  readMessageIds: []    // 既読済みメッセージIDのリスト（全プレイ累計）
}
```

- `AchievementTracker` は `StorySystem` が保持する既読数を参照し、ストーリー既読数実績の進捗を算出する。
