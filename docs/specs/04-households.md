# 04. 世帯 (Households)

複数の個人顧客を「世帯」としてまとめて管理する（保険の世帯単位提案を想定）。

- ソース: `packages/api/src/households/`
- 接頭辞: `/households`
- ガード: `JwtAuthGuard` + `PermissionsGuard`

## データモデル

| モデル | フィールド |
|--------|-----------|
| `Household` | `tenantId`, `name`(必須), `postalCode?`, `address?`, `phone?`, `deletedAt?` |
| `HouseholdMembership` | `householdId`, `customerId`。複合主キー `@@id([householdId, customerId])` かつ `@@unique([customerId])` |

最重要制約: **`@@unique([customerId])`** により、**1 顧客は最大 1 世帯にしか所属できない**。

## エンドポイント

| メソッド | パス | 権限 | 概要 |
|---------|------|------|------|
| GET | `/households` | `household.read` | 一覧 |
| POST | `/households` | `household.create` | 作成 |
| GET | `/households/:id` | `household.read` | 取得 |
| PATCH | `/households/:id` | `household.update` | 更新 |
| DELETE | `/households/:id` | `household.delete` | 論理削除 |
| POST | `/households/:id/members` | `household.update` | メンバー追加 |
| DELETE | `/households/:id/members/:customerId` | `household.update` | メンバー削除 |

### POST `/households`
リクエスト: `{ name(必須), postalCode?, address?, phone? }`

### PATCH `/households/:id`
`name`/`postalCode`/`address`/`phone` を部分更新（`undefined` は据え置き）。

### DELETE `/households/:id`
`deletedAt = now` の論理削除。`HouseholdMembership` は残る（メンバー紐付けは物理的に保持）。

### POST `/households/:id/members`
リクエスト: `{ customerId(必須) }`

業務ルール:
1. 世帯が同一テナントに存在必須（不在→404）
2. 顧客が同一テナントに存在必須（不在→404）
3. 顧客カテゴリが **INDIVIDUAL** のみ追加可（CORPORATE 等→400「Only individual customers...」）
4. その顧客が既にいずれかの世帯に所属していれば→400「Customer already belongs to a household」
5. 追加後は**世帯の最新状態**（メンバー一覧込み）を返す

### DELETE `/households/:id/members/:customerId`
- 世帯存在チェック（不在→404）
- 当該顧客のメンバーシップが存在し、かつその `householdId` が `:id` と一致しなければ→404
- メンバーシップを物理削除し、世帯の最新状態を返す

## レスポンス形

```json
{
  "id","tenantId","name","postalCode","address","phone",
  "members": [ { "id","name" } ],   // 非削除顧客のみ
  "createdAt","updatedAt"
}
```
> `members` は `customer.deletedAt = null` の顧客のみを含む（論理削除済み顧客は表示されない）。

## 設計上の注意

- 世帯を論理削除してもメンバーシップは残るため、その顧客は依然「世帯所属あり」と判定され、
  別世帯に追加できない（`@@unique([customerId])`）。世帯削除前のメンバー解除運用が必要。
- 法人顧客は世帯に追加できない。
</content>
