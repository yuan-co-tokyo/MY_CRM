# 06. ユーザー管理 (Users)

テナント内のユーザーを管理する（テナント管理者向け）。クロステナント操作は [10. Admin](10-admin.md)。

- ソース: `packages/api/src/users/`
- 接頭辞: `/users`
- ガード: `JwtAuthGuard` + `PermissionsGuard`

## データモデル

| モデル | フィールド |
|--------|-----------|
| `User` | `tenantId`, `email`(全体ユニーク), `passwordHash`, `name`, `status`(ACTIVE/SUSPENDED), `userType`(SUPER_ADMIN/ADMIN/STANDARD/PRIVILEGED), `deletedAt?` |
| `UserRole` | `userId` × `roleId`（直接ロール付与。複合主キー） |

## エンドポイント

| メソッド | パス | 権限 | 概要 |
|---------|------|------|------|
| GET | `/users` | `user.read` | 一覧（フィルタ可） |
| POST | `/users` | `user.create` | 作成 |
| GET | `/users/:id` | `user.read` | 取得 |
| PATCH | `/users/:id` | `user.update` | 更新 |

> **DELETE エンドポイントは存在しない**（`user.delete` 権限は seed されるが、テナント API では未使用。
> ユーザー削除は Admin API 経由のみ）。

### GET `/users`
クエリ: `status?`(ACTIVE/SUSPENDED), `userType?`(ADMIN/STANDARD/PRIVILEGED)。
`tenantId` + `deletedAt:null` で絞り、`createdAt desc` 順。

### POST `/users`
```json
{
  "email": "user@example.com",  // 必須・email形式・全体ユニーク
  "password": "Secret123!",     // 必須・8文字以上
  "name": "新規ユーザー",         // 必須
  "status": "ACTIVE",           // 既定 ACTIVE
  "userType": "STANDARD",       // ADMIN/STANDARD/PRIVILEGED、既定 STANDARD
  "roleIds": ["<roleId>"]       // 既定 []・全て同一テナントのロール必須
}
```
処理:
1. `roleIds` がすべて同一テナントの非削除ロールか検証（`assertRoleIdsInTenant`、違反→400）
2. パスワードを bcrypt(コスト12) でハッシュ
3. `User` 作成 + `UserRole` 同時作成
4. email 重複（P2002）→ 400「Email already exists」

> `userType` に **SUPER_ADMIN は指定できない**（Zod enum で `ADMIN/STANDARD/PRIVILEGED` のみ許可）。

### PATCH `/users/:id`
全項目任意の部分更新:
- `password` を渡した場合のみ再ハッシュ。未指定なら据え置き
- `roleIds` を渡した場合は**全置換**（既存 `UserRole` を全削除→再作成、トランザクション内）
- 未指定の `roleIds` はロール変更なし
- email/userType/status/name は `??` 合体で部分更新

## レスポンス形

```json
{
  "id","tenantId","email","name","status","userType",
  "roleIds": ["<roleId>"],
  "createdAt","updatedAt"
}
```
> `passwordHash` は返さない。

## 設計上の注意

- **自テナント外ユーザーは操作不可**: 全クエリが `tenantId` で絞られるため、他テナントの
  ユーザー ID を指定しても 404。
- email のユニークは**全テナント横断**（`User.email @unique`）。他テナントで使用中の
  メールは登録できず 400 になる。
- PATCH で自分自身を `SUSPENDED` 化することも防がれていない（自己ロックの可能性）。
</content>
