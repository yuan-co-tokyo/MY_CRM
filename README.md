# MY CRM

マルチテナント対応の CRM（顧客管理）システム。
NestJS + Prisma + PostgreSQL のバックエンド API と、React + Vite の 2 つのフロントエンドで構成されています。

---

## システム構成

```
my_crm/
├── packages/
│   ├── api/      # バックエンド API (NestJS + Prisma)  :3000
│   ├── web/      # テナントユーザー向けフロントエンド (React + Vite)  :5173
│   └── admin/    # スーパーアドミン向け管理画面 (React + Vite)  :5174
├── docker-compose.yml   # PostgreSQL コンテナ定義
└── pnpm-workspace.yaml
```

### 技術スタック

| レイヤー | 技術 |
|----------|------|
| ランタイム | Node.js |
| パッケージマネージャー | pnpm (Workspaces) |
| バックエンド | NestJS / TypeScript / Passport-JWT / Zod |
| ORM | Prisma 5 |
| DB | PostgreSQL 16 |
| フロントエンド | React 19 / TypeScript / Vite |

### マルチテナント設計

- すべてのデータ（顧客・ユーザー・グループ・ロール）は `tenantId` でスコープされる
- JWT ペイロードに `tenantId` を含め、API 側でテナントを自動フィルタリング
- ソフトデリート方式（`deletedAt`）を採用
- スーパーアドミン（`userType: SUPER_ADMIN`）のみ全テナントをクロス操作可能

### 主要モジュール

| モジュール | エンドポイント | 説明 |
|-----------|---------------|------|
| Auth | `/auth/*` | ログイン・リフレッシュ・ログアウト・`/me` |
| Customers | `/customers/*` | 顧客 CRUD |
| Interactions | `/interactions/*` | 顧客とのやり取り記録 |
| Users | `/users/*` | テナント内ユーザー管理 |
| Groups | `/groups/*` | ユーザーグループ管理 |
| Roles | `/roles/*` | ロール・パーミッション管理 |
| Dashboard | `/dashboard/stats` | 統計情報 |
| Admin | `/admin/tenants`, `/admin/users` | クロステナント管理（SUPER_ADMIN 専用） |

---

## ローカル環境構築

### 前提条件

- Node.js 20+
- pnpm 9+（`npm install -g pnpm`）
- Docker / Docker Compose

### 1. リポジトリをクローン

```bash
git clone <repository-url>
cd my_crm
```

### 2. 依存パッケージをインストール

```bash
pnpm install
```

### 3. PostgreSQL を起動

```bash
docker compose up -d
```

データベース接続先: `postgresql://postgres:postgres@localhost:5432/my_crm`

### 4. 環境変数を設定

```bash
cp packages/api/.env.example packages/api/.env  # ファイルがない場合は下記を参照
```

`packages/api/.env` の内容（デフォルト値）:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/my_crm"
PORT=3000
JWT_ACCESS_SECRET="dev_access_secret_change_me"
ACCESS_TOKEN_TTL="15m"
REFRESH_TOKEN_TTL_DAYS=30

# Seed 用（任意）
SEED_TENANT_NAME="テストテナント"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="ChangeMe123!"
SEED_SUPER_ADMIN_EMAIL="superadmin@example.com"
SEED_SUPER_ADMIN_PASSWORD="SuperAdmin123!"
```

> **本番環境では** `JWT_ACCESS_SECRET` を必ず強力な値に変更してください。

### 5. DB マイグレーションを実行

```bash
cd packages/api
pnpm migrate:dev
```

### 6. シードデータを投入

```bash
pnpm prisma:seed
```

投入されるデータ:

| 種別 | 内容 |
|------|------|
| テナント | `テストテナント` / `テストテナント2` |
| ユーザー | `admin@example.com` (ADMIN) / `admin2@example.com` (ADMIN) |
| スーパーアドミン | `superadmin@example.com` (SUPER_ADMIN) |
| ロール | ADMIN / PRIVILEGED / STANDARD（各テナントに作成） |
| パーミッション | customer / interaction / user / group / role / tenant 操作権限 |

---

## 起動方法

3 つのターミナルを開いてそれぞれ起動します。

### API サーバー（必須）

```bash
cd packages/api
pnpm dev
# → http://localhost:3000
```

### テナントユーザー向けフロントエンド

```bash
cd packages/web
pnpm dev
# → http://localhost:5173
```

ログイン情報:

| メール | パスワード | ロール |
|--------|-----------|--------|
| `admin@example.com` | `ChangeMe123!` | ADMIN（テストテナント） |
| `admin2@example.com` | `ChangeMe123!` | ADMIN（テストテナント2） |

### 管理画面（スーパーアドミン専用）

```bash
cd packages/admin
pnpm dev
# → http://localhost:5174
```

ログイン情報:

| メール | パスワード |
|--------|-----------|
| `superadmin@example.com` | `SuperAdmin123!` |

管理画面では全テナントのテナント・ユーザーを横断的に管理できます。

---

## よく使うコマンド

### マイグレーション

```bash
cd packages/api

# マイグレーションを作成して適用（開発時）
pnpm migrate:dev -- --name <migration_name>

# 既存マイグレーションを適用のみ（本番 / CI）
pnpm migrate:deploy

# Prisma Client を再生成
pnpm prisma:generate

# Prisma Studio（GUI でデータを確認）
pnpm prisma:studio
```

### ビルド

```bash
# API をビルド
cd packages/api && pnpm build

# Web をビルド
cd packages/web && pnpm build

# Admin をビルド
cd packages/admin && pnpm build
```

---

## ディレクトリ構成（API）

```
packages/api/src/
├── admin/           # スーパーアドミン向け CRUD（クロステナント）
├── auth/            # JWT 認証・リフレッシュトークン
├── common/          # 共通パイプ（ZodValidationPipe 等）
├── customers/       # 顧客管理
├── dashboard/       # 統計情報
├── groups/          # グループ管理
├── interactions/    # インタラクション管理
├── prisma/          # PrismaService・PrismaModule
├── roles/           # ロール・パーミッション管理
└── users/           # テナント内ユーザー管理
```

## ディレクトリ構成（フロントエンド）

```
packages/web/src/
├── App.tsx           # ルーティング・認証状態管理
├── LoginPage.tsx     # ログイン画面
├── DashboardPage.tsx # ダッシュボード
└── style.css         # 共通スタイル

packages/admin/src/
├── App.tsx           # ログイン・ナビゲーション
├── TenantsPage.tsx   # テナント管理
└── UsersPage.tsx     # ユーザー管理
```

---

## データモデル概要

```
Tenant ──< User >──< UserGroup >──< Group
                └──< UserRole  >──< Role >──< RolePermission >──< Permission
                └── Customer   >──< CustomerAssignee
                              └──< Interaction
```

- `Tenant`: テナント（組織単位）
- `User`: テナントに所属するユーザー。`userType` は `SUPER_ADMIN` / `ADMIN` / `PRIVILEGED` / `STANDARD`
- `Customer`: 顧客情報（`LEAD` / `ACTIVE` / `INACTIVE`）
- `Interaction`: 顧客とのやり取り記録（`CALL` / `EMAIL` / `MEETING` / `NOTE`）
- `Role` / `Permission`: ロールベースアクセス制御（RBAC）

---

## トラブルシューティング

**DB に接続できない**
```bash
docker compose ps   # コンテナが起動しているか確認
docker compose up -d
```

**Prisma Client が古い**
```bash
cd packages/api && pnpm prisma:generate
```

**ポートが競合している**
- API: `packages/api/.env` の `PORT` を変更
- Web: `packages/web/vite.config.ts` の `server.port` を変更
- Admin: `packages/admin/vite.config.ts` の `server.port` を変更
