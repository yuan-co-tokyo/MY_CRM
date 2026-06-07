# MY CRM 機能仕様書

本ディレクトリは、`my_crm` コードベースを調査して逆生成した**機能仕様書（as-built spec）**です。
記述はすべて実装（`packages/api/src` および `prisma/schema.prisma`）を正としています。
README.md / DESIGN.md には未記載の機能（保険申込・契約、世帯、法人従業員・子会社など）も含みます。

## システム概要

保険代理店向けを想定した**マルチテナント CRM**。

- **バックエンド**: NestJS + Prisma 5 + PostgreSQL 16（`:3000`）
- **フロントエンド（テナント向け）**: React 19 + Vite（`:5173`）
- **フロントエンド（管理者向け）**: React 19 + Vite（`:5174`）
- **認証**: Passport-JWT（アクセストークン）+ 自前のリフレッシュトークン
- **バリデーション**: Zod（`ZodValidationPipe`）

## 横断的な設計原則

| 原則 | 内容 |
|------|------|
| マルチテナント | 全業務データは `tenantId` でスコープ。JWT の `tenantId` で自動フィルタ |
| ソフトデリート | `deletedAt` による論理削除。参照系は常に `deletedAt: null` を条件に含める |
| RBAC | `Permission`（コード）→ `Role` → `User`/`Group` の経路で権限判定 |
| スーパーアドミン | `userType = SUPER_ADMIN` のみ `/admin/*` でクロステナント操作可 |
| 例外方針 | 不正参照=404、業務ルール違反/重複=400、権限不足=403、認証失敗=401 |

## 機能別仕様

| # | 仕様書 | エンドポイント接頭辞 | 概要 |
|---|--------|--------------------|------|
| 01 | [認証 (Auth)](01-auth.md) | `/auth` | ログイン・トークン更新・ログアウト・自己情報 |
| 02 | [顧客管理 (Customers)](02-customers.md) | `/customers` | 顧客 CRUD・個人/法人・従業員・子会社 |
| 03 | [インタラクション (Interactions)](03-interactions.md) | `/interactions` | 顧客対応履歴 CRUD |
| 04 | [世帯 (Households)](04-households.md) | `/households` | 世帯と個人顧客のメンバー管理 |
| 05 | [保険申込・契約 (Insurance)](05-insurance.md) | `/applications` `/contracts` `/customers/:id/...` | 保険の申込・契約 CRUD |
| 06 | [ユーザー管理 (Users)](06-users.md) | `/users` | テナント内ユーザー CRUD・ロール割当 |
| 07 | [グループ (Groups)](07-groups.md) | `/groups` | グループ・メンバー・ロール割当 |
| 08 | [ロール・権限 (Roles & Permissions)](08-roles-permissions.md) | `/roles` `/permissions` | RBAC 定義 |
| 09 | [ダッシュボード (Dashboard)](09-dashboard.md) | `/dashboard` | テナント統計 |
| 10 | [スーパーアドミン (Admin)](10-admin.md) | `/admin` | クロステナントのテナント/ユーザー管理 |

データモデルの全体像は [data-model.md](data-model.md) を参照。

## 共通の振る舞い

### 認証ヘッダ
JWT 保護エンドポイントは `Authorization: Bearer <accessToken>` を要求する。

### 権限ガード
`/customers` 等の業務エンドポイントは `JwtAuthGuard` + `PermissionsGuard` の二段構え。
`@RequirePermissions("xxx.yyy")` で必要権限コードを宣言し、ユーザーの保有ロール
（直接付与 + グループ経由）の権限集合に**すべて**含まれなければ 403。

### バリデーション失敗
Zod スキーマ違反は `ZodValidationPipe` が 400（`message` に Zod のエラー配列）を返す。
</content>
