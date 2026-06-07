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
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  customerId: string;
  token: string;
};

export default function TodoPanel({ customerId, token }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    title: "",
    dueDate: "",
    priority: "" as "" | "LOW" | "MEDIUM" | "HIGH"
  });
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Task[]>(`/tasks?customerId=${encodeURIComponent(customerId)}`, token);
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
  }, [customerId, token]);

  useEffect(() => { load(); }, [load]);

  const handleComplete = async (task: Task) => {
    const reopen = task.status === "DONE";
    try {
      await apiFetch(`/tasks/${task.id}/complete${reopen ? "?reopen=true" : ""}`, token, { method: "PATCH" });
      await load();
    } catch {
      // ignore
    }
  };

  const handleAdd = async () => {
    if (!addForm.title.trim()) return;
    setAddError(null);
    try {
      await apiFetch("/tasks", token, {
        method: "POST",
        body: JSON.stringify({
          title: addForm.title.trim(),
          dueDate: addForm.dueDate ? new Date(addForm.dueDate).toISOString() : undefined,
          priority: addForm.priority || undefined,
          customerId
        })
      });
      setShowAdd(false);
      setAddForm({ title: "", dueDate: "", priority: "" });
      await load();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "作成に失敗しました");
    }
  };

  const openTasks = tasks.filter((t) => t.status === "OPEN");
  const doneTasks = tasks.filter((t) => t.status === "DONE");

  return (
    <div className="detail-section">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <p className="eyebrow detail-section-title">TODO</p>
        <span className="chip" style={{ fontSize: 11 }}>{openTasks.length}</span>
      </div>

      {error && (
        <p style={{ color: "var(--clr-danger)", fontSize: "0.8125rem" }}>{error}</p>
      )}

      {loading ? (
        <p className="muted" style={{ fontSize: "0.8125rem" }}>読み込み中...</p>
      ) : tasks.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.8125rem" }}>タスクがありません</p>
      ) : (
        <div>
          {openTasks.map((task) => (
            <div
              key={task.id}
              style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.4rem 0", borderBottom: "1px solid var(--border)" }}
            >
              <input
                type="checkbox"
                checked={false}
                onChange={() => handleComplete(task)}
                style={{ marginTop: "0.2rem", cursor: "pointer", flexShrink: 0, width: "auto", padding: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{task.title}</span>
                {task.dueDate && (
                  <span style={{ fontSize: "0.75rem", color: "var(--muted)", marginLeft: "0.5rem" }}>
                    {new Date(task.dueDate).toLocaleDateString("ja-JP")}
                  </span>
                )}
              </div>
            </div>
          ))}
          {doneTasks.map((task) => (
            <div
              key={task.id}
              style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", padding: "0.4rem 0", borderBottom: "1px solid var(--border)", opacity: 0.6 }}
            >
              <input
                type="checkbox"
                checked={true}
                onChange={() => handleComplete(task)}
                style={{ marginTop: "0.2rem", cursor: "pointer", flexShrink: 0, width: "auto", padding: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: "0.875rem", textDecoration: "line-through", color: "var(--muted)" }}>{task.title}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "0.75rem" }}>
        <button
          className="ghost"
          style={{ padding: "0.25rem 0.75rem", fontSize: "0.8125rem" }}
          onClick={() => { setShowAdd(true); setAddError(null); }}
        >
          + タスクを追加
        </button>
      </div>

      {showAdd && (
        <div className="modal">
          <div className="modal-card">
            <h3>タスクを追加</h3>
            {addError && (
              <p style={{ color: "var(--clr-danger)", fontSize: "0.8125rem", marginBottom: "0.5rem" }}>{addError}</p>
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
            </div>
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={() => { setShowAdd(false); setAddForm({ title: "", dueDate: "", priority: "" }); }}
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
    </div>
  );
}
