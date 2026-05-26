# Gravity Freight V2: Development Backlog

## 仕様設計
- [ ] core_scenarios に記載されているシナリオで必要となるクラスのインターフェースを設計する
    - core_scenarios.md で進捗管理するため、Backlogには詳細の進捗は記載しない
    - 1回のセッションで設計するシナリオは1～2個程度とする
- [ ] 永続データ構造を具体化する
    - 対象: game_record_data / rank_data / flight_record_index
    - 共通 DataManager の getSavedData / setSavedData を前提に、各所有クラスのデータ構造を定義する
- [ ] リプレイ画面の未確定 UI を仕様化する
    - 航行終了後ボーナスの表示方法
    - リプレイ行選択時の発射構成プレビュー有無
- [ ] FlightReplaySnapshots 完成後に保存データサイズを検証する
    - 20件保存時の `flight_record_index` サイズを確認する
    - 圧縮の要否、圧縮後サイズ、復元コストを評価する
    - 共通 DataManager の保存方式で問題なく扱えるか確認する
- [ ] 未承認 API の採否を判断する
    - CelestialBody.getGravityVector()
    - ExitArc.getFacilityType()

## 実装
- [ ] 設計したクラスを実装する（このバックログを実施するときにはクラス一覧をバックログに展開すること）

