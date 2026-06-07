# 10. スーパーアドミン (Admin)

全テナントを横断して、テナントとユーザーを管理する。管理画面（`packages/admin`, `:5174`）が消費する。

- ソース: `packages/api/src/admin/`
- 接頭辞: `/admin/tenants`, `/admin/users`
- ガード: `JwtAuthGuard` + **`SuperAdminGuard`**

## アクセス制御

`SuperAdminGuard` は JWT の `userType === "SUPER_ADMIN"` のみ許可（それ以外は false → 403）。
RBAC の権限コードは使わない（`PermissionsGuard` 不使用）。

SUPER_ADMIN ユーザーは seed で `__system__` テナントに所属する特殊ユーザー
（`superadmin@example.com` / `SuperAdmin123!`）。

## テナント管理 — `/admin/tenants`

| メソッド | パス | 概要 |
|---------|------|------|
| GET | `/admin/tenants` | 一覧 |
| POST | `/admin/tenants` | 作成 |
| PATCH | `/admin/tenants/:id` | 名称更新 |
| DELETE | `/admin/tenants/:id` | 論理削除（204） |

- GET: `deletedAt: null` かつ **`name != "__system__"`**（システムテナントを除外）、`createdAt asc`。
  返却: `{ id, name, createdAt, updatedAt }`
- POST: `{ name(必須) }` → テナント作成
- PATCH: `{ name? }` → 不在なら 404
- DELETE: `deletedAt = now`。HTTP 204（No Content）

## ユーザー管理 — `/admin/users`

| メソッド | パス | 概要 |
|---------|------|------|
| GET | `/admin/users?tenantId=` | 一覧（テナント絞り込み任意） |
| POST | `/admin/users` | 作成 |
| PATCH | `/admin/users/:id` | 更新 |
| DELETE | `/admin/users/:id` | 論理削除（204） |

- GET: `deletedAt: null` かつ **`userType != SUPER_ADMIN`**（スーパーアドミンを一覧から除外）。
  `tenantId` クエリ指定時はそのテナントのみ。各要素に `tenant:{id,name}` を付加
- POST: `{ tenantId(必須), email, password(8+), name, userType?, status? }`
  - `userType` は `ADMIN/STANDARD/PRIVILEGED`（既定 STANDARD）。SUPER_ADMIN は作れない
  - パスワードは bcrypt(コスト12)
  - **任意のテナントにユーザーを作成できる**（クロステナント）
- PATCH: `{ email?, name?, status?, userType? }` の部分更新。不在なら 404。
  - 実装は truthy チェック（`...(data.email ? ...)`）のため、空文字は無視される
- DELETE: `deletedAt = now`。HTTP 204

返却（user）: `{ id, email, name, status, userType, tenantId, tenant:{id,name}, createdAt, updatedAt }`

## 設計上の注意

- **Admin の create/update には email 重複の明示ハンドリングがない**: 既存メールでの作成は
  P2002 が捕捉されず 500 になりうる（テナント API 側の users は 400 変換済み）。
- Admin のユーザー作成では**ロール割当ができない**（`roleIds` 非対応）。ロール付与は
  テナント API（`/users`）または別途必要。
- テナント論理削除時、その配下のユーザー・顧客等はカスケード削除されない（孤立データが残る）。
- `__system__` テナントと SUPER_ADMIN は一覧 API から常に除外され、管理画面に現れない。
</content>
