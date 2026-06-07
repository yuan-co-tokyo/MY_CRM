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

type CrmEvent = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  location?: string | null;
  type?: "MEETING" | "CALL" | "OTHER" | null;
  customerId?: string | null;
};

type EventForm = {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  type: "MEETING" | "CALL" | "OTHER";
  description: string;
};

const emptyForm = (): EventForm => ({
  title: "",
  startAt: new Date().toISOString().slice(0, 16),
  endAt: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
  location: "",
  type: "MEETING",
  description: ""
});

const typeLabel: Record<string, string> = {
  MEETING: "ミーティング",
  CALL: "電話",
  OTHER: "その他"
};

type Props = {
  customerId: string;
  token: string;
};

export default function EventPanel({ customerId, token }: Props) {
  const [events, setEvents] = useState<CrmEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<CrmEvent[]>(
        `/events?customerId=${encodeURIComponent(customerId)}`,
        token
      );
      setEvents(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "予定の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [customerId, token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("この予定を削除しますか？")) return;
      try {
        await apiFetch(`/events/${id}`, token, { method: "DELETE" });
        await load();
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "削除に失敗しました");
      }
    },
    [token, load]
  );

  const handleFormSubmit = useCallback(async () => {
    if (!form.title.trim()) {
      setFormError("タイトルは必須です");
      return;
    }
    if (!form.startAt || !form.endAt) {
      setFormError("開始日時・終了日時は必須です");
      return;
    }
    if (new Date(form.endAt) < new Date(form.startAt)) {
      setFormError("終了日時は開始日時以降にしてください");
      return;
    }
    setFormError("");
    setFormSubmitting(true);
    try {
      await apiFetch("/events", token, {
        method: "POST",
        body: JSON.stringify({
          title: form.title,
          startAt: new Date(form.startAt).toISOString(),
          endAt: new Date(form.endAt).toISOString(),
          location: form.location || undefined,
          type: form.type,
          customerId,
          description: form.description || undefined
        })
      });
      setShowForm(false);
      setForm(emptyForm());
      await load();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setFormSubmitting(false);
    }
  }, [form, customerId, token, load]);

  return (
    <div className="detail-sections">
      <div className="detail-section">
        <p className="eyebrow detail-section-title">予定一覧</p>

        {loading ? (
          <p className="muted">読み込み中...</p>
        ) : error ? (
          <p style={{ color: "var(--clr-danger)", fontSize: "0.875rem" }}>{error}</p>
        ) : events.length === 0 ? (
          <p className="muted">予定がありません</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {events.map((ev) => (
              <div
                key={ev.id}
                style={{
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "0.5rem",
                  fontSize: "0.875rem"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{ev.title}</span>
                    {ev.type && (
                      <span className="chip" style={{ marginLeft: "0.5rem", fontSize: 11 }}>
                        {typeLabel[ev.type] ?? ev.type}
                      </span>
                    )}
                  </div>
                  <button
                    className="ghost"
                    style={{ color: "var(--clr-danger)", fontSize: 11, padding: "0.1rem 0.4rem" }}
                    onClick={() => handleDelete(ev.id)}
                  >
                    削除
                  </button>
                </div>
                <div style={{ color: "var(--muted)", marginTop: "0.15rem" }}>
                  {new Date(ev.startAt).toLocaleString("ja-JP")} 〜{" "}
                  {new Date(ev.endAt).toLocaleString("ja-JP")}
                </div>
                {ev.location && (
                  <div style={{ color: "var(--muted)" }}>{ev.location}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="detail-actions">
        <button
          className="primary"
          onClick={() => {
            setForm(emptyForm());
            setFormError("");
            setShowForm(true);
          }}
        >
          予定を追加
        </button>
      </div>

      {showForm && (
        <div className="modal">
          <div className="modal-card">
            <h3>予定を追加</h3>
            {formError && (
              <p style={{ color: "var(--clr-danger)", fontSize: 13, marginBottom: 8 }}>{formError}</p>
            )}
            <div className="form-grid">
              <label className="form-full">
                タイトル *
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </label>
              <label>
                開始日時 *
                <input
                  type="datetime-local"
                  value={form.startAt}
                  onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                />
              </label>
              <label>
                終了日時 *
                <input
                  type="datetime-local"
                  value={form.endAt}
                  onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                />
              </label>
              <label>
                場所
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                />
              </label>
              <label>
                種別
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EventForm["type"] }))}
                >
                  <option value="MEETING">ミーティング</option>
                  <option value="CALL">電話</option>
                  <option value="OTHER">その他</option>
                </select>
              </label>
              <label className="form-full">
                説明
                <textarea
                  value={form.description}
                  rows={2}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="ghost"
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
              >
                キャンセル
              </button>
              <button className="primary" onClick={handleFormSubmit} disabled={formSubmitting}>
                {formSubmitting ? "保存中..." : "追加"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
