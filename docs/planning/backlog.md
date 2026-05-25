# Gravity Freight V2: Development Backlog

## 仕様設計
- [ ] core_scenarios に記載されているシナリオで必要となるクラスのインターフェースを設計する
    - core_scenarios.md で進捗管理するため、Backlogには詳細の進捗は記載しない
    - 1回のセッションで設計するシナリオは1～2個程度とする
- [ ] リプレイ再現に必要な snapshot 仕様を具体化する
    - 対象: Sector / Rocket / CelestialBody / ExitArc など
    - 各クラスの責務境界に沿って、保存・復元するフィールドを定義する
- [ ] 永続データ構造を具体化する
    - 対象: achievement_data / rank_data / flight_record_index
    - 共通 DataManager の getSavedData / setSavedData を前提に、各所有クラスのデータ構造を定義する
- [ ] リプレイ画面の未確定 UI を仕様化する
    - 航行終了後ボーナスの表示方法
    - リプレイ行選択時の発射構成プレビュー有無
- [ ] 未承認 API の採否を判断する
    - CelestialBody.getGravityVector()
    - ExitArc.getFacilityType()

## 実装
- [ ] 設計したクラスを実装する（このバックログを実施するときにはクラス一覧をバックログに展開すること）

