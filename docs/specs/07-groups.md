# 07. グループ (Groups)

ユーザーをグループ化し、グループ単位でロールを付与する（間接 RBAC）。

- ソース: `packages/api/src/groups/`
- 接頭辞: `/groups`
- ガード: `JwtAuthGuard` + `PermissionsGuard`

## データモデル

| モデル | フィールド |
|--------|-----------|
| `Group` | `tenantId`, `name`(必須), `deletedAt?` |
| `UserGroup` | `userId` × `groupId`（メンバー。複合主キー） |
| `GroupRole` | `groupId` × `roleId`（グループへのロール付与。複合主キー） |

グループに付与したロールは、所属メンバー全員に**間接的に**適用される（[08. 権限判定](08-roles-permissions.md) 参照）。

## エンドポイント

| メソッド | パス | 権限 | 概要 |
|---------|------|------|------|
| GET | `/groups` | `group.read` | 一覧 |
| POST | `/groups` | `group.create` | 作成 |
| GET | `/groups/:id` | `group.read` | 取得 |
| PATCH | `/groups/:id` | `group.update` | 名称更新 |
| DELETE | `/groups/:id` | `group.delete` | 論理削除 |
| PUT | `/groups/:id/members` | `group.update` | メンバー全置換 |
| PUT | `/groups/:id/roles` | **`role.update`** | ロール全置換 |

### POST `/groups`
リクエスト: `{ name(必須) }`。同一テナントで重複名（P2002）→ 400「Group name already exists」。
> 注: ユニーク制約はスキーマ上 `Group` に明示されていないが、サービスは P2002 を捕捉して 400 を返す実装。

### PUT `/groups/:id/members`
リクエスト: `{ userIds: [...] }`（空配列可）。
- 全 `userIds` が同一テナントの非削除ユーザーか検証（違反→400）
- 既存メンバーを全削除 → 指定ユーザーで再作成（トランザクション・**全置換**）

### PUT `/groups/:id/roles`
リクエスト: `{ roleIds: [...] }`（空配列可）。**必要権限は `role.update`**（`group.update` ではない）。
- 全 `roleIds` が同一テナントの非削除ロールか検証（違反→400）
- 既存 `GroupRole` を全削除 → 再作成（**全置換**）

### DELETE `/groups/:id`
`deletedAt = now` の論理削除。`UserGroup` / `GroupRole` は残る。

## レスポンス形

```json
{
  "id","tenantId","name",
  "memberUserIds": ["<userId>"],
  "roleIds": ["<roleId>"],
  "createdAt","updatedAt"
}
```

## 設計上の注意

- メンバー/ロールの追加・削除は**差分ではなく全置換**。部分更新したい場合もクライアントが
  全リストを送る必要がある。
- ロール割当に `role.update` を要求するため、「グループ管理者だがロール管理権限はない」
  ユーザーはメンバー編集（`group.update`）はできてもロール編集はできない。
- 論理削除後もメンバーシップ・ロール紐付けが残るため、権限判定側は
  `group.deletedAt = null` を条件に含めて削除済みグループを除外している。
</content>
