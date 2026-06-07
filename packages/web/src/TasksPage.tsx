import { useCallback, useEffect, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.json();
}

type Task = {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | null;
  status: "OPEN" | "DONE" | "CANCELLED";
  customerId?: string | null;
  assigneeId?: string | null;
  assignee?: { id: string; name: string; email: string } | null;
  customer?: { id: string; name: string } | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Customer = { id: string; name: string };

type ScopeFilter = "mine" | "all";
type DueFilter = "all" | "today" | "overdue";
type StatusTab = "open" | "done";

type Props = {
  token: string;
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高"
};

export default function TasksPage({ token }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>("mine");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");
  const [statusTab, setStatusTab] = useState<StatusTab>("open");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Task | null>(null);
  const [addForm, setAddForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "" as "" | "LOW" | "MEDIUM" | "HIGH",
    assigneeId: "",
    customerId: ""
  });
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "" as "" | "LOW" | "MEDIUM" | "HIGH",
    assigneeId: "",
    customerId: "",
    status: "OPEN" as "OPEN" | "DONE" | "CANCELLED"
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (scopeFilter === "mine") params.set("scope", "mine");
      if (dueFilter === "today") params.set("due", "today");
      if (dueFilter === "overdue") params.set("due", "overdue");
      const data = await apiFetch<Task[]>(`/tasks?${params}`, token);
      data.sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      });
      setTasks(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "不明なエラー");
    }
    setLoading(false);
  }, [token, scopeFilter, dueFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    apiFetch<Customer[]>("/customers", token).then(setCustomers).catch(() => {});
  }, [token]);

  const handleComplete = async (task: Task) => {
    const reopen = task.status === "DONE";
    try {
      await apiFetch(`/tasks/${task.id}/complete${reopen ? "?reopen=true" : ""}`, token, { method: "PATCH" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このタスクを削除しますか？")) return;
    try {
      await apiFetch(`/tasks/${id}`, token, { method: "DELETE" });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "削除に失敗しました");
    }
  };

  const handleAdd = async () => {
    if (!addForm.title.trim()) return;
    setFormError(null);
    try {
      await apiFetch("/tasks", token, {
        method: "POST",
        body: JSON.stringify({
          title: addForm.title.trim(),
          description: addForm.description || undefined,
          dueDate: addForm.dueDate ? new Date(addForm.dueDate).toISOString() : undefined,
          priority: addForm.priority || undefined,
          assigneeId: addForm.assigneeId || undefined,
          customerId: addForm.customerId || undefined
        })
      });
      setShowAddModal(false);
      setAddForm({ title: "", description: "", dueDate: "", priority: "", assigneeId: "", customerId: "" });
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "作成に失敗しました");
    }
  };

  const openEdit = (task: Task) => {
    setEditTarget(task);
    setEditForm({
      title: task.title,
      description: task.description ?? "",
      dueDate: task.dueDate ? task.dueDate.slice(0, 16) : "",
      priority: task.priority ?? "",
      assigneeId: task.assigneeId ?? "",
      customerId: task.customerId ?? "",
      status: task.status
    });
    setFormError(null);
  };

  const handleEdit = async () => {
    if (!editTarget || !editForm.title.trim()) return;
    setFormError(null);
    try {
      await apiFetch(`/tasks/${editTarget.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description || undefined,
          dueDate: editForm.dueDate ? new Date(editForm.dueDate).toISOString() : undefined,
          priority: editForm.priority || undefined,
          assigneeId: editForm.assigneeId || undefined,
          customerId: editForm.customerId || undefined,
          status: editForm.status
        })
      });
      setEditTarget(null);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : "更新に失敗しました");
    }
  };

  const isOverdue = (task: Task) =>
    !!(task.dueDate && task.status === "OPEN" && new Date(task.dueDate) < new Date());

  const displayedTasks = tasks.filter((t) =>
    statusTab === "open" ? t.status === "OPEN" : t.status === "DONE"
  );

  return (
    <main className="main-content">
      <section className="panel">
        <div className="panel-header">
          <h2>TODO</h2>
          <span className="chip">{displayedTasks.length}</span>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {(["mine", "all"] as ScopeFilter[]).map((s) => (
              <button
                key={s}
                className={scopeFilter === s ? "primary" : "ghost"}
                style={{ padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}
                onClick={() => setScopeFilter(s)}
              >
                {s === "mine" ? "自分のタスク" : "全担当"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: "0.25rem" }}>
            {(["all", "today", "overdue"] as DueFilter[]).map((d) => (
              <button
                key={d}
                className={dueFilter === d ? "primary" : "ghost"}
                style={{ padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}
                onClick={() => setDueFilter(d)}
              >
                {d === "all" ? "全期間" : d === "today" ? "本日期限" : "期限切れ"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.75rem", borderBottom: "2px solid var(--border)", paddingBottom: "0.5rem" }}>
          {(["open", "done"] as StatusTab[]).map((s) => (
            <button
              key={s}
              className={statusTab === s ? "primary" : "ghost"}
              style={{ padding: "0.25rem 0.75rem", fontSize: "0.875rem" }}
              onClick={() => setStatusTab(s)}
            >
              {s === "open" ? "未完了" : "完了済み"}
            </button>
          ))}
        </div>

        {error && (
          <p style={{ color: "var(--clr-danger)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{error}</p>
        )}

        {loading ? (
          <p className="muted">読み込み中...</p>
        ) : displayedTasks.length === 0 ? (
          <p className="muted">タスクがありません</p>
        ) : (
          <div>
            {displayedTasks.map((task) => (
              <div
                key={task.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.75rem 0",
                  borderBottom: "1px solid var(--border)",
                  backgroundColor: isOverdue(task) ? "rgba(185,28,28,0.04)" : undefined
                }}
              >
                <input
                  type="checkbox"
                  checked={task.status === "DONE"}
                  onChange={() => handleComplete(task)}
                  style={{ marginTop: "0.25rem", cursor: "pointer", flexShrink: 0, width: "auto", padding: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontWeight: 500,
                        textDecoration: task.status === "DONE" ? "line-through" : undefined,
                        color: task.status === "DONE" ? "var(--muted)" : undefined,
                        cursor: "pointer"
                      }}
                      onClick={() => openEdit(task)}
                    >
                      {task.title}
                    </span>
                    {task.priority && (
                      <span className="chip" style={{ fontSize: "0.75rem" }}>
                        {PRIORITY_LABELS[task.priority]}
                      </span>
                    )}
                    {isOverdue(task) && (
                      <span className="chip" style={{ fontSize: "0.75rem", backgroundColor: "#fee2e2", color: "#b91c1c" }}>
                        期限切れ
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.2rem" }}>
                      {task.description}
                    </p>
                  )}
                  <div style={{ display: "flex", gap: "1rem", marginTop: "0.2rem", fontSize: "0.8125rem", color: "var(--muted)" }}>
                    {task.dueDate && (
                      <span>期日: {new Date(task.dueDate).toLocaleDateString("ja-JP")}</span>
                    )}
                    {task.assignee && <span>担当: {task.assignee.name}</span>}
                    {task.customer && <span>顧客: {task.customer.name}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  <button
                    className="ghost"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.8125rem" }}
                    onClick={() => openEdit(task)}
                  >
                    編集
                  </button>
                  <button
                    className="ghost"
                    style={{ padding: "0.25rem 0.5rem", fontSize: "0.8125rem", color: "var(--clr-danger)" }}
                    onClick={() => handleDelete(task.id)}
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "1rem" }}>
          <button className="primary" onClick={() => { setShowAddModal(true); setFormError(null); }}>
            タスクを追加
          </button>
        </div>
      </section>

      {showAddModal && (
        <div className="modal">
          <div className="modal-card">
            <h3>タスクを追加</h3>
            {formError && (
              <p style={{ color: "var(--clr-danger)", fontSize: "0.8125rem", marginBottom: "0.5rem" }}>{formError}</p>
            )}
            <div className="form-grid">
              <label className="form-full">
                タイトル *
                <input
                  value={addForm.title}
                  onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="タスクのタイトル"
                />
              </label>
              <label className="form-full">
                説明
                <input
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <label>
                期日
                <input
                  type="datetime-local"
                  value={addForm.dueDate}
                  onChange={(e) => setAddForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </label>
              <label>
                優先度
                <select
                  value={addForm.priority}
                  onChange={(e) => setAddForm((f) => ({ ...f, priority: e.target.value as "" | "LOW" | "MEDIUM" | "HIGH" }))}
                >
                  <option value="">-</option>
                  <option value="LOW">低</option>
                  <option value="MEDIUM">中</option>
                  <option value="HIGH">高</option>
                </select>
              </label>
              <label className="form-full">
                顧客
                <select
                  value={addForm.customerId}
                  onChange={(e) => setAddForm((f) => ({ ...f, customerId: e.target.value }))}
                >
                  <option value="">顧客なし</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={() => { setShowAddModal(false); setAddForm({ title: "", description: "", dueDate: "", priority: "", assigneeId: "", customerId: "" }); }}
              >
                キャンセル
              </button>
              <button className="primary" onClick={handleAdd} disabled={!addForm.title.trim()}>
                作成
              </button>
            </div>
          </div>
        </div>
      )}

      {editTarget && (
        <div className="modal">
          <div className="modal-card">
            <h3>タスクを編集</h3>
            {formError && (
              <p style={{ color: "var(--clr-danger)", fontSize: "0.8125rem", marginBottom: "0.5rem" }}>{formError}</p>
            )}
            <div className="form-grid">
              <label className="form-full">
                タイトル *
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label className="form-full">
                説明
                <input
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <label>
                期日
                <input
                  type="datetime-local"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, dueDate: e.target.value }))}
                />
              </label>
              <label>
                優先度
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm((f) => ({ ...f, priority: e.target.value as "" | "LOW" | "MEDIUM" | "HIGH" }))}
                >
                  <option value="">-</option>
                  <option value="LOW">低</option>
                  <option value="MEDIUM">中</option>
                  <option value="HIGH">高</option>
                </select>
              </label>
              <label>
                ステータス
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as "OPEN" | "DONE" | "CANCELLED" }))}
                >
                  <option value="OPEN">未完了</option>
                  <option value="DONE">完了</option>
                  <option value="CANCELLED">キャンセル</option>
                </select>
              </label>
              <label className="form-full">
                顧客
                <select
                  value={editForm.customerId}
                  onChange={(e) => setEditForm((f) => ({ ...f, customerId: e.target.value }))}
                >
                  <option value="">顧客なし</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setEditTarget(null)}>キャンセル</button>
              <button className="primary" onClick={handleEdit} disabled={!editForm.title.trim()}>保存</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
