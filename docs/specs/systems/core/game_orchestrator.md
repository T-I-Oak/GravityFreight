# Specification: GameOrchestrator Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: メインコントローラー。
- **責務**: 全体ステートマシンの管理、各ライフサイクルの開始・終了（Begin/End Contract）のトリガー。

## 2. インターフェース (Interface)

- **`boot(): Promise<void>`**
    - アプリケーション起動の起点。`DataManager` によるデータロード等の初期化プロセスを統括し、完了後に初期画面（タイトル）へ遷移させる。

- **`startGame(): void`**
    - 新規ゲームを開始する。プレイヤー状態の初期化、セクター番号の「0」セットを行い、ワープ演出（セクター開始画面）をキックする。
