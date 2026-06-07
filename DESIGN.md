# CRM Dashboard Feature — Design Document

## Overview
This document describes the Dashboard analytics feature added to the CRM application.

## Architecture

### Tech Stack
- **Backend**: NestJS + TypeScript + Prisma + PostgreSQL
- **Frontend**: React 19 + TypeScript + Vite
- **Testing**: Jest (backend) + Vitest (frontend) + @testing-library/react

### New Feature: Dashboard Analytics

#### API Endpoint
`GET /dashboard/stats` (protected by JWT)

**Response:**
```json
{
  "totalCustomers": 42,
  "leadCount": 15,
  "activeCount": 20,
  "inactiveCount": 7,
  "totalInteractions": 128,
  "activeUsers": 5
}
```

#### Backend Module Structure
```
packages/api/src/dashboard/
├── dashboard.dto.ts         — DashboardStatsDto type
├── dashboard.service.ts     — getStats(tenantId) using Prisma count queries
├── dashboard.controller.ts  — GET /dashboard/stats with JwtAuthGuard
├── dashboard.module.ts      — NestJS module definition
├── dashboard.service.spec.ts — Unit tests for service
└── dashboard.controller.spec.ts — Unit tests for controller
```

#### Frontend Component
`packages/web/src/DashboardPage.tsx` — Stats display component with:
- Customer statistics panel (total, lead, active, inactive counts)
- Activity panel (total interactions, active users)

#### Integration Points
- `packages/api/src/app.module.ts` — DashboardModule registered
- `packages/web/src/App.tsx` — Dashboard tab and view added

## Agent Team Workflow
1. **Agent 2** (Backend): Implemented NestJS DashboardModule
2. **Agent 3** (Frontend): Implemented React DashboardPage component
3. **Agent 4** (QA): Set up Vitest + @testing-library/react, wrote unit tests
4. **Agent 1** (Manager): Integrated all work, created this document

## Multi-Tenant Design
All dashboard queries are scoped by `tenantId` (extracted from JWT payload) with soft-delete filtering (`deletedAt: null`).

---

## Task & Event Features — Design Document

### Overview
Tasks (TODO管理) and Events (スケジュール管理) features add customer-linked task tracking and calendar scheduling to the CRM.

### Task エンティティ

#### API概要
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/tasks` | タスク一覧（scopeFilter: mine/all, dueFilter: overdue/today/week/all） |
| POST | `/tasks` | タスク作成 |
| PATCH | `/tasks/:id` | タスク更新 |
| PATCH | `/tasks/:id/complete` | 完了/再オープン切替 |
| DELETE | `/tasks/:id` | タスク削除 |

#### Backend Module Structure
```
packages/api/src/tasks/
├── tasks.dto.ts             — CreateTaskDto, UpdateTaskDto
├── tasks.service.ts         — CRUD + complete/reopen logic
├── tasks.controller.ts      — REST endpoints with JwtAuthGuard
├── tasks.module.ts          — NestJS module definition
└── tasks.service.spec.ts    — Unit tests for service
```

#### UI概要
- `packages/web/src/TasksPage.tsx` — 全タスク一覧ページ（scope/due フィルタ、作成・編集・削除・完了切替）
- `packages/web/src/TodoPanel.tsx` — 顧客詳細内TODOパネル（顧客IDでフィルタ済みタスク一覧）
- App.tsx sidebar: 「TODO」ボタン → `view === "tasks"`
- 顧客詳細タブ: 「TODO」タブ → `customerDetailView === "todos"`

### Event エンティティ

#### API概要
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | イベント一覧（customerId, start/end フィルタ） |
| POST | `/events` | イベント作成 |
| PATCH | `/events/:id` | イベント更新 |
| DELETE | `/events/:id` | イベント削除 |

#### Backend Module Structure
```
packages/api/src/events/
├── events.dto.ts            — CreateEventDto, UpdateEventDto
├── events.service.ts        — CRUD logic
├── events.controller.ts     — REST endpoints with JwtAuthGuard
├── events.module.ts         — NestJS module definition
└── events.service.spec.ts   — Unit tests for service
```

#### UI概要
- `packages/web/src/SchedulePage.tsx` — 全イベントカレンダーページ（FullCalendar v6.1.20使用）
- `packages/web/src/EventPanel.tsx` — 顧客詳細内予定パネル（顧客IDでフィルタ済みイベント一覧）
- App.tsx sidebar: 「スケジュール」ボタン → `view === "schedule"`
- 顧客詳細タブ: 「予定」タブ → `customerDetailView === "events"`

### 採用ライブラリ

| ライブラリ | バージョン | 用途 |
|-----------|-----------|------|
| `@fullcalendar/react` | v6.1.20 | カレンダーUIコンポーネント |
| `@fullcalendar/daygrid` | v6.1.20 | 月表示プラグイン |
| `@fullcalendar/timegrid` | v6.1.20 | 週/日表示プラグイン |
| `@fullcalendar/interaction` | v6.1.20 | クリック・ドラッグ操作 |

### 動作確認手順

```bash
# 1. DB マイグレーション
cd packages/api
npx prisma migrate dev

# 2. シードデータ投入（任意）
npx prisma db seed

# 3. API ビルド
npm run build

# 4. API テスト（SKIP=0確認）
npm test

# 5. Frontend ビルド
cd ../web
pnpm run build

# 6. Frontend テスト（SKIP=0確認）
pnpm test

# 7. 開発サーバ起動
cd ../api && npm run start:dev &
cd ../web && pnpm dev
```

### App.tsx ViewKey 拡張サマリ

- `ViewKey` union に `"tasks" | "schedule"` 追加
- `customerDetailView` union に `"todos" | "events"` 追加
- `(view as string)` キャストを `(view as ViewKey)` に正規化（TypeScript制御フロー絞り込み対策）
