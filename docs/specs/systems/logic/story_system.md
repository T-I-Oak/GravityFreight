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
        3. 取得したデータの `readMessageIds` を内部変数に展開する。

#### DataManager との連携シーケンス
1. `StorySystem.initialize()`
2. 　→ `DataManager.getSavedStoryProgress(migrationMap)`
3. 　　→ (DataManager 内部) `localStorage` からデータ取得・マイグレーション
4. 　← 復元された `StoryProgressData` オブジェクトを返す
5. `StorySystem` が内部状態を更新

### 状態管理 (State Management)
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
