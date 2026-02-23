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
