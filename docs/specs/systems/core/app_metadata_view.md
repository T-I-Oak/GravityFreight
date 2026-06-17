# Specification: AppMetadataView Class

## 1. 役割と責務 (Role & Responsibility)

- **所属ドメイン**: System Domain
- **生存期間**: App Lifecycle
- **役割**: アプリメタデータ表示。
- **責務**:
    - タイトル画面フッターにアプリバージョンを表示する。
    - コピーライト情報を表示し、ポータルサイトへのリンクを生成する。

## 2. インターフェース (Interface)

### メソッド (Methods)

- **`setMetadata(metadata: AppMetadata): void`**
    - `metadata.version` を `Ver {version}` として `#version` に反映する。
    - `metadata.copyright` の `holder`, `year`, `portal`, `portalUrl` を使用してコピーライト表示を構築する。
    - ポータルリンクには `target="_blank"` と `rel="noopener noreferrer"` を付与する。
    - ポータルリンクはリンクであることが視認できるよう、下線付きで表示する。

## 3. 責務境界

- `AppMetadataView` は DOM 表示だけを担当し、バージョン値やコピーライト値を生成しない。
- メタデータの提供元は `GameDataRepository.getAppMetadata()` とする。
- `UIController` は画面制御の入口として `setAppMetadata()` を受け付けるが、実際の DOM 構築は `AppMetadataView` へ委譲する。
