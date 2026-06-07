# 02. 顧客管理 (Customers)

顧客（個人 / 法人）の CRUD と、法人特有の関係（従業員・子会社）を管理する。

- ソース: `packages/api/src/customers/`
- 接頭辞: `/customers`
- ガード: `JwtAuthGuard` + `PermissionsGuard`（全エンドポイント）

## データモデル

`Customer` を中心に、カテゴリ別のサブテーブルへ 1:1 で分岐する設計。

```
Customer ──1:1── IndividualCustomer   (customerCategory = INDIVIDUAL のとき)
         ──1:1── CorporateCustomer    (customerCategory = CORPORATE のとき)
         ──1:1── HouseholdMembership  (世帯所属。04 参照)
         ──N:M── User (CustomerAssignee = 担当者, CustomerOwner = 所有者)
         ──1:N── Interaction / InsuranceApplication / InsuranceContract
```

| モデル | 主なフィールド |
|--------|---------------|
| `Customer` | `name`(必須), `email?`, `phone?`, `status`(LEAD/ACTIVE/INACTIVE), `ownerUserId?`, `customerCategory?`(INDIVIDUAL/CORPORATE), `postalCode?`, `address?`, `notes?` |
| `IndividualCustomer` | `gender?`, `birthDate?`, `mobilePhone?`, `workCompany?`, `workPhone?`, `workEmail?`, `annualIncome?` |
| `CorporateCustomer` | `parentCorporateId?`（親法人＝子会社階層） |
| `CustomerEmployment` | 法人(employer)と個人(employee)の雇用関係。`jobTitle?`, `department?` |

制約:
- `Customer` は `@@unique([tenantId, email])`（同一テナント内でメール重複不可。`email` は null 可）
- `customerCategory` は省略可（未分類の顧客が存在しうる）

## 主要エンドポイント（顧客本体）

| メソッド | パス | 権限 | 概要 |
|---------|------|------|------|
| GET | `/customers` | `customer.read` | 一覧（フィルタ可） |
| POST | `/customers` | `customer.create` | 作成 |
| GET | `/customers/:id` | `customer.read` | 取得 |
| PATCH | `/customers/:id` | `customer.update` | 更新 |
| DELETE | `/customers/:id` | `customer.delete` | 論理削除 |

### GET `/customers`
クエリ: `ownerUserId?`, `status?`(LEAD/ACTIVE/INACTIVE)。
`tenantId` + `deletedAt:null` で絞り、`createdAt desc` 順。各要素は後述の**統合レスポンス形**。

### POST `/customers`
リクエスト（主要・すべて任意項目は省略可）:
```jsonc
{
  "name": "山田太郎",              // 必須, 1文字以上
  "email": "a@example.com",        // email形式 or null
  "phone": "03-1234-5678",
  "status": "LEAD",                // 既定 LEAD
  "ownerUserId": "<userId>",       // テナント内に存在必須
  "assigneeUserIds": ["<userId>"], // 既定 []、全てテナント内に存在必須
  "customerCategory": "INDIVIDUAL",// INDIVIDUAL/CORPORATE/null
  // ↓ INDIVIDUAL のときのみ IndividualCustomer に保存される
  "gender": "MALE", "birthDate": "1990-01-01",
  "mobilePhone": "...", "workCompany": "...", "workPhone": "...",
  "workEmail": "w@example.com", "annualIncome": 5000000,
  "postalCode": "100-0001", "address": "東京都...", "notes": "..."
}
```
処理:
1. `ownerUserId` と `assigneeUserIds` がすべて**同一テナントの非削除 User** か検証（`ensureUsersInTenant`）。違反→400
2. `Customer` を作成。`assigneeUserIds` は `CustomerAssignee` を同時作成
3. `customerCategory === INDIVIDUAL` → `IndividualCustomer` を同時作成（個人項目を格納）
4. `customerCategory === CORPORATE` → 空の `CorporateCustomer` を同時作成
5. それ以外（null）→ サブテーブルなし

> **注意**: 個人項目（`gender` 等）を渡しても `customerCategory` が INDIVIDUAL でなければ保存されない。

### PATCH `/customers/:id`
部分更新。`undefined`（未指定）と `null`（明示的クリア）を区別する。

カテゴリ変更時のサブテーブル整合（トランザクション内）:
- 新カテゴリ `INDIVIDUAL` → `IndividualCustomer` を upsert、`CorporateCustomer` を削除
- 新カテゴリ `CORPORATE` → `CorporateCustomer` を upsert、`IndividualCustomer` を削除
- 新カテゴリ `null` → 両サブテーブルを削除

`assigneeUserIds` を渡した場合は**全置換**（既存 `CustomerAssignee` を全削除→再作成）。
未指定なら担当者は変更しない。`ownerUserId`/`assigneeUserIds` はテナント検証あり。

### DELETE `/customers/:id`
`deletedAt = now` の論理削除。物理削除しない。関連（担当者・サブテーブル・申込/契約）は残る。

## レスポンス形（統合ビュー）

`Customer` 本体 + 個人項目 + 法人項目を**フラットに統合**して返す（`toResponse`）。

```jsonc
{
  "id","tenantId","name","email","phone","status",
  "owner": { "id","name","email" } | null,
  "assignees": [ { "id","name","email" } ],
  "customerCategory","postalCode","address","notes",
  // 個人項目（IndividualCustomer 由来。なければ null）
  "gender","birthDate","mobilePhone","workCompany","workPhone","workEmail","annualIncome",
  // 世帯（04 参照）
  "householdId": "<id>" | null,
  // 法人項目（CorporateCustomer 由来）
  "parentCorporateId": "<id>" | null,
  "parentCorporate": { "id","name" } | null,
  "subsidiaries": [ { "id","name" } ] | null,
  "createdAt","updatedAt"
}
```

## 法人 — 従業員 (Employees)

法人顧客に紐づく個人顧客を「従業員」として管理する（`CustomerEmployment`）。

| メソッド | パス | 権限 |
|---------|------|------|
| GET | `/customers/:id/employees` | `customer.read` |
| POST | `/customers/:id/employees` | `customer.update` |
| PATCH | `/customers/:id/employees/:employmentId` | `customer.update` |
| DELETE | `/customers/:id/employees/:employmentId` | `customer.update` |

業務ルール:
- `:id` は **CORPORATE** カテゴリの顧客でなければならない（`ensureCorporateCustomer`、違反→400 / 不在→404）
- 追加する `individualCustomerId` は同一テナントの **INDIVIDUAL** 顧客必須（違反→400 / 不在→404）
- `CustomerEmployment` は `@@unique([corporateCustomerId, individualCustomerId])`（同一ペア重複不可）
- POST リクエスト: `{ individualCustomerId(必須), jobTitle?, department? }`
- DELETE は雇用関係を**物理削除**

レスポンス要素: `{ employmentId, customer:{id,name,email}, jobTitle, department, createdAt }`

## 法人 — 子会社 (Subsidiaries)

法人間の親子（子会社）階層を管理する（`CorporateCustomer.parentCorporateId`）。

| メソッド | パス | 権限 |
|---------|------|------|
| GET | `/customers/:id/subsidiaries` | `customer.read` |
| POST | `/customers/:id/subsidiaries` | `customer.update` |
| DELETE | `/customers/:id/subsidiaries/:subsidiaryId` | `customer.update` |

業務ルール:
- `:id` は CORPORATE 必須
- POST リクエスト: `{ subsidiaryCustomerId(必須) }`。指定先も同一テナントの **CORPORATE** 必須
- 自分自身を子会社にできない（`id === subsidiaryCustomerId` → 400）
- 子会社化 = 子会社側の `parentCorporateId` を `:id` に設定（**子会社は親を 1 社しか持てない**）
- DELETE = 子会社側の `parentCorporateId` を null に戻す（解除のみ。顧客は削除しない）

GET レスポンス: `{ parentCorporate: {id,name}|null, subsidiaries: [{id,name}] }`

## 設計上の注意

- **email 重複時の挙動**: `@@unique([tenantId, email])` 違反は Prisma の P2002 が送出されるが、
  customers では明示ハンドリングしておらず 500 になりうる（users/groups/roles は P2002→400 に変換済み）。改善余地あり。
- **子会社の循環参照**: A→B→A のような循環を防ぐチェックはない。
- 個人項目を更新する際、`customerCategory` が INDIVIDUAL に確定していないと `IndividualCustomer` が
  作られず、項目が保存されない点に注意。
</content>
