# データモデル全体像

`packages/api/prisma/schema.prisma` に基づく ER 概要。すべて PostgreSQL、ID は `cuid()`。

## エンティティ関連図（論理）

```
Tenant ─┬─< User ─┬─< UserGroup >── Group ─┬─< GroupRole >─┐
        │         ├─< UserRole  >── Role <─┘               │
        │         ├─< RefreshToken                          ▼
        │         ├─< Interaction                    RolePermission >── Permission(global)
        │         └─< Customer (owner: CustomerOwner)
        │
        ├─< Group ─< GroupRole >── Role
        ├─< Role  ─< RolePermission >── Permission
        ├─< Household ─< HouseholdMembership >── Customer
        │
        └─< Customer ─┬─1:1 IndividualCustomer
                      ├─1:1 CorporateCustomer ─< (CorporateHierarchy: parent/subsidiaries)
                      ├─1:1 HouseholdMembership
                      ├─< CustomerAssignee >── User
                      ├─< CustomerEmployment (Employer/Employee 自己参照 via Customer)
                      ├─< Interaction
                      ├─< InsuranceApplication ─┬─ InsuranceLine(global)
                      └─< InsuranceContract     ├─ InsuranceType(global)
                                                └─ InsuranceCompany(global)
```

## テナントスコープの有無

| スコープ | モデル |
|---------|--------|
| **テナント固有**（`tenantId` あり） | `User`, `Group`, `Customer`, `Interaction`, `Role`, `Household`, `InsuranceApplication`, `InsuranceContract` |
| **グローバルマスタ**（`tenantId` なし） | `Permission`, `InsuranceLine`, `InsuranceType`, `InsuranceCompany` |
| **中間/従属テーブル** | `UserGroup`, `UserRole`, `GroupRole`, `RolePermission`, `CustomerAssignee`, `CustomerEmployment`, `HouseholdMembership`, `IndividualCustomer`, `CorporateCustomer`, `RefreshToken` |

## Enum 一覧

| Enum | 値 |
|------|----|
| `UserStatus` | `ACTIVE`, `SUSPENDED` |
| `UserType` | `SUPER_ADMIN`, `ADMIN`, `STANDARD`, `PRIVILEGED` |
| `CustomerCategory` | `INDIVIDUAL`, `CORPORATE` |
| `Gender` | `MALE`, `FEMALE`, `OTHER` |
| `CustomerStatus` | `LEAD`, `ACTIVE`, `INACTIVE` |
| `InteractionType` | `CALL`, `EMAIL`, `MEETING`, `NOTE` |
| `InsuranceCategory` | `LIFE`, `AUTO`, `FIRE`, `ACCIDENT`, `SPECIALTY`, `MARINE` |

## 重要なユニーク制約

| モデル | 制約 | 意味 |
|--------|------|------|
| `User` | `email @unique` | メールは**全テナント横断**でユニーク |
| `Customer` | `@@unique([tenantId, email])` | テナント内でメール重複不可 |
| `HouseholdMembership` | `@@unique([customerId])` | 1 顧客は 1 世帯のみ |
| `CustomerEmployment` | `@@unique([corporateCustomerId, individualCustomerId])` | 同一雇用ペア重複不可 |
| `Permission` / `InsuranceLine` / `InsuranceType` / `InsuranceCompany` | `name`/`code @unique` | グローバルマスタ |

## ソフトデリート対応

`deletedAt` を持つ（論理削除）: `Tenant`, `User`, `Group`, `Customer`, `Interaction`, `Role`,
`Household`, `InsuranceApplication`, `InsuranceContract`。

中間テーブル（`UserGroup` 等）と 1:1 従属（`IndividualCustomer` 等）は `deletedAt` を持たず、
親の論理削除後も物理的に残る。各サービスは参照時に常に `deletedAt: null` を条件へ含める。

## 横断的な実装パターン

- **マルチテナント分離**: 全業務クエリが `where: { tenantId, deletedAt: null }` を基本形とする
- **担当者/所有者**: `Customer.ownerUserId`（1人の所有者）と `CustomerAssignee`（複数担当者）を区別
- **全置換更新**: 関連の付け替え（担当者・ロール・メンバー・権限）は差分ではなくトランザクション全置換
- **日付項目**: API は ISO 文字列で受け取り `new Date()` で変換、未指定/空は `null`
</content>
