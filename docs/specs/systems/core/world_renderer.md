# Specification: WorldRenderer Class (Skeleton)

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: ワールド描画エンジン。
- **責務**:
  - Canvas上におけるワールド要素（背景、天体、ロケット、予測軌道、エフェクト等）の描画順序の制御。
  - 1フレームごとの描画ループの実行と、Canvasへの描画コマンドの送出。
