# 05. 保険申込・契約 (Insurance Applications & Contracts)

顧客に紐づく保険の**申込 (Application)** と**契約 (Contract)** を管理する。
両者はスキーマ・API ともほぼ同一構造（別テーブル・別エンドポイント）。

- ソース: `packages/api/src/applications/`, `packages/api/src/contracts/`
- 接頭辞: `/applications`, `/contracts`, `/customers/:customerId/applications`, `/customers/:customerId/contracts`
- ガード: `JwtAuthGuard` + `PermissionsGuard`

## データモデル

| モデル | フィールド |
|--------|-----------|
| `InsuranceApplication` / `InsuranceContract` | `tenantId`, `customerId`, `category`(必須), `insuranceLineId?`, `insuranceTypeId?`, `insuranceCompanyId?`, `petName?`, `effectiveDate?`(保険始期), `expirationDate?`(満期), `applicationDate?`(申込日), `accountingDate?`(計上日), `deletedAt?` |
| `InsuranceLine` | 保険種目。`name` 全体ユニーク（テナント非依存のマスタ） |
| `InsuranceType` | 保険種類。`name` 全体ユニーク |
| `InsuranceCompany` | 引受保険会社。`name` 全体ユニーク |

`category`（`InsuranceCategory` enum）: `LIFE`(生保) / `AUTO`(自動車) / `FIRE`(火災) / `ACCIDENT`(傷害) / `SPECIALTY`(特種) / `MARINE`(海上)。

> マスタ（Line/Type/Company）は `tenantId` を持たず**全テナント共通**。`petName` はペット保険等の被保険対象名を想定した自由項目。

## エンドポイント構成

各リソースに 2 つのコントローラがある:

### ネストルート（顧客スコープ）— 作成はこちらのみ
| メソッド | パス（applications。contracts も同形） | 権限 |
|---------|------|------|
| GET | `/customers/:customerId/applications` | `application.read` |
| POST | `/customers/:customerId/applications` | `application.create` |
| GET | `/customers/:customerId/applications/:id` | `application.read` |
| PATCH | `/customers/:customerId/applications/:id` | `application.update` |
| DELETE | `/customers/:customerId/applications/:id` | `application.delete` |

### フラットルート（テナント横断一覧）
| メソッド | パス | 権限 |
|---------|------|------|
| GET | `/applications` | `application.read` |
| GET | `/applications/:id` | `application.read` |
| PATCH | `/applications/:id` | `application.update` |

> contracts も `contract.read/create/update/delete` で同一構造。
> **DELETE と POST はネストルート（顧客スコープ）にのみ存在**。フラットルートには無い。

### POST（作成）
リクエスト:
```jsonc
{
  "category": "LIFE",          // 必須・上記6種のいずれか
  "insuranceLineId": "<id>",   // 任意（存在検証なし）
  "insuranceTypeId": "<id>",
  "insuranceCompanyId": "<id>",
  "petName": "ポチ",
  "effectiveDate": "2026-07-01",   // ISO文字列 → Date変換。空/未指定は null
  "expirationDate": "2027-07-01",
  "applicationDate": "2026-06-01",
  "accountingDate": "2026-06-15"
}
```
処理:
1. `:customerId` が同一テナントの非削除顧客か検証（不在→404）
2. レコードを作成（マスタ ID の実在検証はしない）

### GET（一覧）
- ネスト版: 顧客存在チェック後、その顧客の申込/契約を `createdAt desc` で返す
- フラット版: テナント内全件を返し、各要素に `customer:{id,name,customerCategory}` を付加

### PATCH / DELETE
- PATCH: 全項目任意の部分更新（`undefined` 据え置き、日付は空→null）
- DELETE: `deletedAt = now` の論理削除（ネストルートのみ）
- 対象不在は一律 404

## レスポンス形

```json
{
  "id","tenantId","customerId","category",
  "insuranceLine":   { "id","name" } | null,
  "insuranceType":   { "id","name" } | null,
  "insuranceCompany":{ "id","name" } | null,
  "petName","effectiveDate","expirationDate","applicationDate","accountingDate",
  "createdAt","updatedAt"
}
```
フラット一覧版のみ追加で `"customer": { "id","name","customerCategory" }`。

## 設計上の注意

- **マスタ ID の実在検証なし**: 存在しない `insuranceLineId` 等を渡すと Prisma の FK 制約違反で
  500 になりうる（テナント越えのマスタ参照も阻止されない）。改善余地あり。
- **申込→契約の自動連携はない**: Application と Contract は独立。申込が契約に「昇格」する処理は未実装。
- マスタ（Line/Type/Company）を作成・編集する CRUD エンドポイントは現状なし（seed/手動投入前提）。
</content>
