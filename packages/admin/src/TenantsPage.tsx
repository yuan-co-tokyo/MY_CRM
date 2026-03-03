import { useEffect, useState } from "react";
import { apiFetch } from "./App.tsx";

type Tenant = {
  id: string;
  name: string;
  createdAt: string;
};

export default function TenantsPage({ token }: { token: string }) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    try {
      const data = await apiFetch<Tenant[]>("/admin/tenants", token);
      setTenants(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "取得に失敗しました");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await apiFetch("/admin/tenants", token, {
        method: "POST",
        body: JSON.stringify({ name: newName })
      });
      setNewName("");
      setShowAdd(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "作成に失敗しました");
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setError("");
    try {
      await apiFetch(`/admin/tenants/${editId}`, token, {
        method: "PATCH",
        body: JSON.stringify({ name: editName })
      });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    setError("");
    try {
      await apiFetch(`/admin/tenants/${id}`, token, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <div className="topbar">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>管理</p>
          <h1 style={{ margin: "4px 0 0" }}>テナント管理</h1>
        </div>
        <button
          className="primary"
          onClick={() => {
            setShowAdd(true);
            setNewName("");
          }}
        >
          + テナントを追加
        </button>
      </div>

      {error && <div className="global-error">{error}</div>}

      {showAdd && (
        <div className="modal">
          <div className="modal-card">
            <h3 style={{ margin: 0 }}>テナントを追加</h3>
            <form onSubmit={(e) => void handleAdd(e)} className="form-grid">
              <div>
                <p className="label">テナント名</p>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  autoFocus
                />
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

      {editId && (
        <div className="modal">
          <div className="modal-card">
            <h3 style={{ margin: 0 }}>テナントを編集</h3>
            <form onSubmit={(e) => void handleEdit(e)} className="form-grid">
              <div>
                <p className="label">テナント名</p>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setEditId(null)}
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

      <div className="panel">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>テナント名</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>作成日</th>
              <th style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13 }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr
                key={t.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td style={{ padding: "10px 12px", fontWeight: 600 }}>{t.name}</td>
                <td style={{ padding: "10px 12px", fontSize: 13, color: "var(--muted)" }}>
                  {new Date(t.createdAt).toLocaleDateString("ja-JP")}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="ghost"
                      style={{ padding: "6px 12px", fontSize: 13 }}
                      onClick={() => {
                        setEditId(t.id);
                        setEditName(t.name);
                      }}
                    >
                      編集
                    </button>
                    <button
                      className="danger"
                      style={{ fontSize: 13 }}
                      onClick={() => void handleDelete(t.id, t.name)}
                    >
                      削除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  style={{ padding: "20px 12px", textAlign: "center", color: "var(--muted)" }}
                >
                  テナントがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
