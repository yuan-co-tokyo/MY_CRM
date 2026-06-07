# 08. ロール・権限 (Roles & Permissions / RBAC)

ロールベースアクセス制御（RBAC）の定義と、実行時の権限判定ロジック。

- ソース: `packages/api/src/roles/`, `packages/api/src/auth/permissions.guard.ts`
- 接頭辞: `/roles`, `/permissions`
- ガード: `JwtAuthGuard` + `PermissionsGuard`

## データモデル

```
Permission ──N:M── Role ──┬── UserRole  ── User
 (code:全体ユニーク)        └── GroupRole ── Group ── UserGroup ── User
```

| モデル | フィールド |
|--------|-----------|
| `Permission` | `code`(全体ユニーク。例 `customer.read`), `description?`。**テナント非依存のマスタ** |
| `Role` | `tenantId`, `name`, `deletedAt?`。テナントごとに定義 |
| `RolePermission` | `roleId` × `permissionId` |
| `UserRole` / `GroupRole` | ユーザー/グループへのロール付与 |

## 権限コード一覧（seed 定義）

| リソース | コード |
|---------|--------|
| 顧客 | `customer.read` / `.create` / `.update` / `.delete` |
| インタラクション | `interaction.read` / `.create` / `.update` / `.delete` |
| ユーザー | `user.read` / `.create` / `.update` / `.delete` |
| グループ | `group.read` / `.create` / `.update` / `.delete` |
| ロール | `role.read` / `.create` / `.update` / `.delete` |
| 権限 | `permission.read` |
| テナント | `tenant.read` / `.update` |
| 世帯 | `household.read` / `.create` / `.update` / `.delete` |
| 保険申込 | `application.read` / `.create` / `.update` / `.delete` |
| 保険契約 | `contract.read` / `.create` / `.update` / `.delete` |

> `tenant.read` / `tenant.update` / `user.delete` は seed されるが、現状どのエンドポイントの
> `@RequirePermissions` でも参照されていない（将来用 or Admin 経由）。

## seed のロール構成（各テナント）

| ロール | 付与権限 |
|--------|---------|
| `ADMIN` | 全権限 |
| `PRIVILEGED` | 全権限 |
| `STANDARD` | `customer.read/create`, `interaction.read/create`, `household.read`, `application.read/create`, `contract.read/create`（参照＋作成中心。更新・削除・管理系なし） |

## エンドポイント — Roles

| メソッド | パス | 権限 | 概要 |
|---------|------|------|------|
| GET | `/roles` | `role.read` | 一覧 |
| POST | `/roles` | `role.create` | 作成 |
| GET | `/roles/:id` | `role.read` | 取得 |
| PATCH | `/roles/:id` | `role.update` | 更新 |
| DELETE | `/roles/:id` | `role.delete` | 論理削除 |

### POST `/roles`
リクエスト: `{ name(必須), permissionCodes?: [] }`
- `permissionCodes` は**コード文字列**で受け取り、内部で `permissionId` に解決（`resolvePermissions`）
- 未知のコードが 1 つでもあれば→400「Permission code not found」
- 同名ロール（P2002）→400「Role name already exists」

### PATCH `/roles/:id`
- `name` を部分更新
- `permissionCodes` を渡した場合は**全置換**（既存 `RolePermission` を全削除→再作成）
- 未指定なら権限は変更しない

### DELETE `/roles/:id`
`deletedAt = now` の論理削除。

レスポンス形:
```json
{ "id","tenantId","name","permissionCodes": ["customer.read", ...], "createdAt","updatedAt" }
```

## エンドポイント — Permissions

| メソッド | パス | 権限 |
|---------|------|------|
| GET | `/permissions` | `permission.read` |

全 `Permission` を `code` 昇順で返す（マスタ参照、テナント非依存）。
レスポンス要素: `{ id, code, description }`

## 権限判定ロジック（PermissionsGuard）

`@RequirePermissions("a", "b")` が付いたハンドラ実行時:

1. メタデータから必要権限配列を取得。空なら**通過**（無宣言＝権限チェックなし）
2. リクエストの JWT ユーザー（`PermissionsGuard` は `JwtAuthGuard` の後段で動作する前提）が無ければ 403
3. ユーザーの**有効ロール ID 集合**を構築:
   - **直接付与**（`UserRole`）: ただし `role.tenantId === JWT.tenantId` かつ `role.deletedAt === null` のもののみ
   - **グループ経由**（`GroupRole`）: ユーザーが所属し、同一テナント・非削除のグループに付いた非削除ロール
4. ロールが 0 件なら 403
5. それらロールの `RolePermission` から権限コード集合を作成
6. 必要権限を**すべて**満たせば通過。1 つでも欠ければ 403「Insufficient permissions」

> **AND 判定**: 複数権限が宣言された場合は全て必要。現状の宣言はすべて単一コードのみ。

## 設計上の注意

- **`userType` と権限は無関係**: `ADMIN` 等の `userType` は権限判定に使われない。
  実際のアクセス可否は付与ロールの権限コードだけで決まる（`SUPER_ADMIN` の `/admin` 系を除く）。
  したがって `userType=ADMIN` でもロール未割当なら業務 API は全て 403。
- **テナント越境防止**: 直接ロールもグループ経由ロールも `tenantId` 一致を必須にしており、
  他テナントのロールが効くことはない。
- `Permission` はグローバルマスタのため、テナントが独自権限コードを増やすことはできない。
</content>
