# 03. インタラクション (Interactions)

顧客との対応履歴（電話・メール・面談・メモ）を記録する。

- ソース: `packages/api/src/interactions/`
- 接頭辞: `/interactions`
- ガード: `JwtAuthGuard` + `PermissionsGuard`

## データモデル

| モデル | フィールド |
|--------|-----------|
| `Interaction` | `tenantId`, `customerId`, `userId`(記録者), `type`(CALL/EMAIL/MEETING/NOTE), `note`(必須), `occurredAt`(発生日時), `createdAt`, `updatedAt`, `deletedAt?` |

- `tenantId` / `customerId` / `userId` にインデックス
- 記録者（`userId`）は作成時の JWT ユーザー（`sub`）で**自動設定**。リクエストでは指定できない

## エンドポイント

| メソッド | パス | 権限 | 概要 |
|---------|------|------|------|
| GET | `/interactions` | `interaction.read` | 一覧（フィルタ可） |
| POST | `/interactions` | `interaction.create` | 作成 |
| GET | `/interactions/:id` | `interaction.read` | 取得 |
| PATCH | `/interactions/:id` | `interaction.update` | 更新 |
| DELETE | `/interactions/:id` | `interaction.delete` | 論理削除 |

### GET `/interactions`
クエリ: `customerId?`, `userId?`, `type?`。
`tenantId` + `deletedAt:null` で絞り、`occurredAt desc` 順。

### POST `/interactions`
```json
{
  "customerId": "<id>",        // 必須・同一テナントの非削除顧客
  "type": "CALL",             // CALL/EMAIL/MEETING/NOTE
  "note": "初回ヒアリング",     // 必須・1文字以上
  "occurredAt": "2026-06-06T09:00:00Z"  // ISO 8601 datetime
}
```
処理:
1. `customerId` が同一テナントの非削除顧客か検証。不在→**400**（`BadRequestException`）
2. `userId = JWT.sub` で `Interaction` を作成

### PATCH `/interactions/:id`
`type` / `note` / `occurredAt` を部分更新（いずれも任意）。
対象は `tenantId` + `deletedAt:null` で限定。不在→404。
> 実装は `??` 合体のため、`note` に空文字を渡しても Zod の `min(1)` で弾かれる。

### DELETE `/interactions/:id`
`deletedAt = now` の論理削除。不在→404。

## レスポンス形

```json
{
  "id","tenantId",
  "customer": { "id","name" },
  "user": { "id","name","email" },
  "type","note","occurredAt","createdAt","updatedAt"
}
```

## 設計上の注意

- 作成時に存在しない顧客を指定した場合のみ **400**。取得/更新/削除で対象 Interaction が
  無い場合は **404**（一貫していない点に留意）。
- `userId`（記録者）は更新できない。担当者の付け替えは不可。
</content>
