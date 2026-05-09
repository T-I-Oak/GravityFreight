# Specification: StorySystem Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Logic Domain
- **生存期間**: App Lifecycle (Service)
- **役割**: 物語（Story）の選択・永続進捗管理。
- **責務**:
    - ストーリーIDごとの永続的な既読状態（isRead）の管理。
    - 条件に応じたストーリーIDの選出。
    - 既読フラグの更新と永続化（LocalStorage等）。

## 2. インターフェース (Interface)

### ライフサイクル (Lifecycle)
- **`initialize(): void`**
    - `DataManager` から保存された進捗データを取得し、自身の内部状態を初期化する。
    - **内部実装詳細**:
        1. `MigrationMap`（DataManager 仕様参照）を定義する。
           - `init()` はデフォルトの `StoryProgressData` を返す。
        2. `DataManager.getSavedStoryProgress(migrationMap)` を呼び出す。
        3. 取得したデータの `readMessageIds` を `Set<string>` に変換し、内部変数 `readIds` に保持する。
        4. **マスタデータの解析**: 物語データ（`content.json`）の全キーを取得し、実在するストーリーIDの集合（`masterIds`）を `Set<string>` として生成・保持する。
        5. セッション変数 `history` を `""` に初期化する。

#### DataManager との連携シーケンス
1. `StorySystem.initialize()`
2. 　→ `DataManager.getSavedStoryProgress(migrationMap)`
3. 　　→ (DataManager 内部) `localStorage` からデータ取得・マイグレーション
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
    - 指定されたストーリーIDを既読としてマークし、最新の状態を `DataManager.setSavedStoryProgress()` を通じて永続化する。

- **`unlockNextStep(branchType: string): void`**
    - 指定された系列（'T', 'R', 'B'）への配送成功に基づき、次のストーリーを解放する。
    - **内部挙動**:
        1. **ガード**: 現在の `history` 文字列の長さがすでに 3 の場合は、更新を行わず終了する。
        2. 現在の `history` 文字列（例: `"T"`) の末尾に `branchType` を連結し、新しい ID（例: `"TR"`) を生成する。
        3. 生成された ID を `history` にセットし、`DataManager.setSavedStoryProgress()` で保存する。

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
    - 指定されたストーリーIDに対応する本文データ（マスタデータ）を引いて返す。
    - **戻り値**: `{ id: string, title: string, discovery: string, body: string, type: string }` 形式。
        - `type`: ID の最後の文字（系列識別子）。

## 3. 内部状態とデータ構造 (State & Data Structures)

### 内部状態 (Instance Properties / Memory only)
- **`history`**: `string` (現在のゲーム内での配送履歴。例: `"TR"`)。タイトル画面に戻るたびに `""` にリセットされる。
- **`readIds`**: `Set<string>` (累計既読IDの集合)。検索効率化のため初期化時に作成。
- **`masterIds`**: `Set<string>` (全ストーリーIDの集合)。`content.json` のキーから生成。

### StoryProgressData (永続化対象)
- **役割**: `DataManager` を通じて LocalStorage に保存されるデータ構造。
```javascript
{
  readMessageIds: []    // 既読済みメッセージIDのリスト（全プレイ累計）
}
```
