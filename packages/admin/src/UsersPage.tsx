import { useEffect, useState } from "react";
import { apiFetch } from "./App.tsx";

type Tenant = { id: string; name: string };
type User = {
  id: string;
  email: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  userType: "ADMIN" | "STANDARD" | "PRIVILEGED";
  tenantId: string;
  tenant: { id: string; name: string };
  createdAt: string;
};

type CreateUserForm = {
  tenantId: string;
  email: string;
  password: string;
  name: string;
  userType: "ADMIN" | "STANDARD" | "PRIVILEGED";
  status: "ACTIVE" | "SUSPENDED";
};

type EditUserForm = {
  email: string;
  name: string;
  userType: "ADMIN" | "STANDARD" | "PRIVILEGED";
  status: "ACTIVE" | "SUSPENDED";
};

const USER_TYPE_LABELS: Record<string, string> = {
  ADMIN: "管理者",
  STANDARD: "スタンダード",
  PRIVILEGED: "プレミアム"
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "有効",
  SUSPENDED: "停止中"
};

export default function UsersPage({ token }: { token: string }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterTenantId, setFilterTenantId] = useState<string>("");
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    tenantId: "",
    email: "",
    password: "",
    name: "",
    userType: "STANDARD",
    status: "ACTIVE"
  });
  const [editForm, setEditForm] = useState<EditUserForm>({
    email: "",
    name: "",
    userType: "STANDARD",
    status: "ACTIVE"
  });

  async function loadTenants() {
    try {
      const data = await apiFetch<Tenant[]>("/admin/tenants", token);
      setTenants(data);
    } catch {
      // ignore
    }
  }

  async function loadUsers() {
    try {
      const query = filterTenantId ? `?tenantId=${filterTenantId}` : "";
      const data = await apiFetch<User[]>(`/admin/users${query}`, token);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    }
  }

  useEffect(() => {
    void loadTenants();
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [filterTenantId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/admin/users", token, {
        method: "POST",
        body: JSON.stringify(createForm)
      });
      setShowAdd(false);
      setCreateForm({
        tenantId: "",
        email: "",
        password: "",
        name: "",
        userType: "STANDARD",
        status: "ACTIVE"
      });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setError("");
    try {
      await apiFetch(`/admin/users/${editUser.id}`, token, {
        method: "PATCH",
        body: JSON.stringify(editForm)
      });
      setEditUser(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setError("");
    try {
      await apiFetch(`/admin/users/${id}`, token, { method: "DELETE" });
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="topbar">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>管理</p>
          <h1 style={{ margin: "4px 0 0" }}>ユーザー管理</h1>
        </div>
        <button
          className="primary"
          onClick={() => {
            setShowAdd(true);
            setCreateForm({
              tenantId: tenants[0]?.id ?? "",
              email: "",
              password: "",
              name: "",
              userType: "STANDARD",
              status: "ACTIVE"
            });
          }}
        >
          + ユーザーを追加
        </button>
      </div>

      {error && <div className="global-error">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        <select
          value={filterTenantId}
          onChange={(e) => setFilterTenantId(e.target.value)}
          style={{ width: "auto", minWidth: 200 }}
        >
          <option value="">全テナント</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="modal">
          <div className="modal-card">
            <h3 style={{ margin: 0 }}>ユーザーを追加</h3>
            <form onSubmit={(e) => void handleCreate(e)} className="form-grid">
              <div>
                <p className="label">テナント</p>
                <select
                  value={createForm.tenantId}
                  onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value })}
                  required
                >
                  <option value="">選択してください</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="label">名前</p>
                <input
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div>
                <p className="label">メールアドレス</p>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <p className="label">パスワード</p>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div>
                <p className="label">ユーザータイプ</p>
                <select
                  value={createForm.userType}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      userType: e.target.value as CreateUserForm["userType"]
                    })
                  }
                >
                  <option value="STANDARD">スタンダード</option>
                  <option value="PRIVILEGED">プレミアム</option>
                  <option value="ADMIN">管理者</option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setShowAdd(false)}
                >
                  キャンセル
                </button>
                <button type="submit" className="primary">
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editUser && (
        <div className="modal">
          <div className="modal-card">
            <h3 style={{ margin: 0 }}>ユーザーを編集</h3>
            <form onSubmit={(e) => void handleEdit(e)} className="form-grid">
              <div>
                <p className="label">名前</p>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div>
                <p className="label">メールアドレス</p>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <p className="label">ユーザータイプ</p>
                <select
                  value={editForm.userType}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      userType: e.target.value as EditUserForm["userType"]
                    })
                  }
                >
                  <option value="STANDARD">スタンダード</option>
                  <option value="PRIVILEGED">プレミアム</option>
                  <option value="ADMIN">管理者</option>
                </select>
              </div>
              <div>
                <p className="label">ステータス</p>
                <select
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      status: e.target.value as EditUserForm["status"]
                    })
                  }
                >
                  <option value="ACTIVE">有効</option>
                  <option value="SUSPENDED">停止中</option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setEditUser(null)}
                >
                  キャンセル
                </button>
                <button type="submit" className="primary">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="panel" style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>名前</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>メール</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>テナント</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>タイプ</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>ステータス</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{u.name}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--muted)" }}>
                  {u.email}
                </td>
                <td style={{ padding: "10px 12px", fontSize: 13 }}>{u.tenant.name}</td>
                <td style={{ padding: "10px 12px" }}>
                  <span className="chip">{USER_TYPE_LABELS[u.userType] ?? u.userType}</span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span
                    className={`chip ${u.status === "ACTIVE" ? "status-active" : "status-inactive"}`}
                  >
                    {STATUS_LABELS[u.status] ?? u.status}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="ghost"
                      style={{ padding: "6px 12px", fontSize: 13 }}
                      onClick={() => {
                        setEditUser(u);
                        setEditForm({
                          email: u.email,
                          name: u.name,
                          userType: u.userType,
                          status: u.status
                        });
                      }}
                    >
                      編集
                    </button>
                    <button
                      className="danger"
                      style={{ fontSize: 13 }}
                      onClick={() => void handleDelete(u.id, u.name)}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{ padding: "20px 12px", textAlign: "center", color: "var(--muted)" }}
                >
                  ユーザーがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
