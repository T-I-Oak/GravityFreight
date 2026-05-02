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
    - 内部で `migrationMap`（バージョンごとの変換関数）を定義し、`DataManager.getSavedStoryProgress(migrationMap)` を呼び出すことで、セーブデータの最新化とデフォルト値の適用を同時に行う。

### 状態管理 (State Management) ※シナリオ 4.1.2 に基づく
- **`isRead(storyId: string): boolean`**
    - 指定されたストーリーIDが既読かどうかを返す。メールアイコンの明滅判定に使用される。

- **`updateReadStatus(storyId: string): void`**
    - 指定されたストーリーIDを既読としてマークし、最新の状態を `DataManager.setSavedStoryProgress()` を通じて永続化する。

## 3. データ構造定義 (Data Structures)

### StoryProgressData (永続化対象)
```javascript
{
  readMessageIds: []    // 既読済みメッセージIDのリスト
}
```
