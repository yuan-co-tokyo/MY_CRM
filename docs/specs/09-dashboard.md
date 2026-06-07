# 09. ダッシュボード (Dashboard)

ログイン中テナントの集計統計を返す。

- ソース: `packages/api/src/dashboard/`
- 接頭辞: `/dashboard`
- ガード: **`JwtAuthGuard` のみ**（`PermissionsGuard` なし＝専用権限コード不要）

## エンドポイント

### GET `/dashboard/stats`
JWT の `tenantId` を用いて、以下 6 指標を**並列カウント**して返す。すべて `deletedAt: null` を条件に含む。

| フィールド | 集計内容 |
|-----------|---------|
| `totalCustomers` | テナント内の非削除顧客総数 |
| `leadCount` | `status = LEAD` の顧客数 |
| `activeCount` | `status = ACTIVE` の顧客数 |
| `inactiveCount` | `status = INACTIVE` の顧客数 |
| `totalInteractions` | 非削除インタラクション総数 |
| `activeUsers` | `status = ACTIVE` の非削除ユーザー数 |

レスポンス 200（`DashboardStatsDto`）:
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

## 設計上の注意

- **権限チェックなし**: ログイン済みであれば `userType`・ロールを問わず参照可能
  （業務系と異なり `@RequirePermissions` を付けていない）。
- `leadCount + activeCount + inactiveCount === totalCustomers`（`status` は 3 値必須のため）。
- 保険申込・契約・世帯の件数は集計対象外（拡張余地）。
- フロントエンドは `packages/web/src/DashboardPage.tsx` がこの API を消費して表示する。
</content>
