# Specification: Item Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: Entity Domain
- **生存期間**: Flight Lifecycle
- **役割**: 基底アイテムクラス。
- **責務**:
    - 全アイテムに共通する基本属性（ID, 名称, 重量, 耐久度等）の保持。
    - アイテムのシリアライズ・デシリアライズ（スナップショット）の提供。

## 2. インターフェース (Interface)

- **`constructor(id: string)`**
    - 指定された ID に基づき、アイテムのインスタンスを生成する。
