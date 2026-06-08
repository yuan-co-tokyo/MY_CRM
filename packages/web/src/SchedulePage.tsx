import { useCallback, useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { DateSelectArg, EventClickArg } from "@fullcalendar/core";

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

type Customer = { id: string; name: string };

type CrmEvent = {
  id: string;
  title: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  location?: string | null;
  type?: "MEETING" | "CALL" | "OTHER" | null;
  customerId?: string | null;
  customer?: { id: string; name: string } | null;
  ownerId?: string | null;
};

type EventForm = {
  title: string;
  startAt: string;
  endAt: string;
  location: string;
  type: "MEETING" | "CALL" | "OTHER";
  customerId: string;
  description: string;
};

const emptyForm = (): EventForm => ({
  title: "",
  startAt: "",
  endAt: "",
  location: "",
  type: "MEETING",
  customerId: "",
  description: ""
});

function toDatetimeLocal(iso: string): string {
  return iso.slice(0, 16);
}

function toISOString(local: string): string {
  if (!local) return "";
  return new Date(local).toISOString();
}

type Props = {
  token: string;
};

export default function SchedulePage({ token }: Props) {
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null);
  const [events, setEvents] = useState<CrmEvent[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState("");

  const [detailEvent, setDetailEvent] = useState<CrmEvent | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventForm>(emptyForm());
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);

  const fetchEvents = useCallback(
    async (from: string, to: string) => {
      setError("");
      try {
        const data = await apiFetch<CrmEvent[]>(
          `/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
          token
        );
        setEvents(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "イベントの取得に失敗しました");
      }
    },
    [token]
  );

  useEffect(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    fetchEvents(from, to);
  }, [fetchEvents]);

  useEffect(() => {
    apiFetch<Customer[]>("/customers", token).then(setCustomers).catch(() => {});
  }, [token]);

  const handleDatesSet = useCallback(
    (arg: { start: Date; end: Date }) => {
      fetchEvents(arg.start.toISOString(), arg.end.toISOString());
    },
    [fetchEvents]
  );

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const id = arg.event.id;
      const ev = events.find((e) => e.id === id);
      if (ev) {
        setDetailEvent(ev);
        setShowDetail(true);
      }
    },
    [events]
  );

  const handleDateClick = useCallback((arg: DateClickArg) => {
    const start = new Date(arg.date);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const f = emptyForm();
    f.startAt = toDatetimeLocal(start.toISOString());
    f.endAt = toDatetimeLocal(end.toISOString());
    setForm(f);
    setFormMode("create");
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  }, []);

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    const f = emptyForm();
    f.startAt = toDatetimeLocal(arg.start.toISOString());
    f.endAt = toDatetimeLocal(arg.end.toISOString());
    setForm(f);
    setFormMode("create");
    setEditingId(null);
    setFormError("");
    setShowForm(true);
  }, []);

  const openEdit = useCallback((ev: CrmEvent) => {
    setForm({
      title: ev.title,
      startAt: toDatetimeLocal(ev.startAt),
      endAt: toDatetimeLocal(ev.endAt),
      location: ev.location ?? "",
      type: ev.type ?? "MEETING",
      customerId: ev.customerId ?? "",
      description: ev.description ?? ""
    });
    setEditingId(ev.id);
    setFormMode("edit");
    setFormError("");
    setShowDetail(false);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("このイベントを削除しますか？")) return;
      try {
        await apiFetch(`/events/${id}`, token, { method: "DELETE" });
        setShowDetail(false);
        setDetailEvent(null);
        const cal = calendarRef.current?.getApi();
        if (cal) {
          const view = cal.view;
          fetchEvents(view.activeStart.toISOString(), view.activeEnd.toISOString());
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "削除に失敗しました");
      }
    },
    [token, fetchEvents]
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
      const body = {
        title: form.title,
        startAt: toISOString(form.startAt),
        endAt: toISOString(form.endAt),
        location: form.location || undefined,
        type: form.type,
        customerId: form.customerId || undefined,
        description: form.description || undefined
      };
      if (formMode === "edit" && editingId) {
        await apiFetch(`/events/${editingId}`, token, {
          method: "PATCH",
          body: JSON.stringify(body)
        });
      } else {
        await apiFetch("/events", token, {
          method: "POST",
          body: JSON.stringify(body)
        });
      }
      setShowForm(false);
      setForm(emptyForm());
      setEditingId(null);
      const cal = calendarRef.current?.getApi();
      if (cal) {
        const view = cal.view;
        fetchEvents(view.activeStart.toISOString(), view.activeEnd.toISOString());
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "保存に失敗しました");
    } finally {
      setFormSubmitting(false);
    }
  }, [form, formMode, editingId, token, fetchEvents]);

  const calendarEvents = events.map((ev) => ({
    id: ev.id,
    title: ev.customer?.name ? `${ev.title} (${ev.customer.name})` : ev.title,
    start: ev.startAt,
    end: ev.endAt
  }));

  const typeLabel: Record<string, string> = {
    MEETING: "ミーティング",
    CALL: "電話",
    OTHER: "その他"
  };

  return (
    <main className="main-content">
      <section className="panel" style={{ padding: "1rem" }}>
        <div className="panel-header">
          <h2>スケジュール</h2>
          <button
            className="primary"
            onClick={() => {
              setForm(emptyForm());
              setFormMode("create");
              setEditingId(null);
              setFormError("");
              setShowForm(true);
            }}
          >
            ＋ 新規イベント
          </button>
        </div>

        {error && <div className="global-error" style={{ marginBottom: "1rem" }}>{error}</div>}

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek"
          }}
          locale="ja"
          events={calendarEvents}
          selectable={true}
          dateClick={handleDateClick}
          select={handleDateSelect}
          eventClick={handleEventClick}
          datesSet={handleDatesSet}
          height="auto"
        />
      </section>

      {showDetail && detailEvent && (
        <div className="modal">
          <div className="modal-card">
            <h3>{detailEvent.title}</h3>
            <div style={{ fontSize: "0.875rem", lineHeight: 1.8 }}>
              <div>
                <span className="label">種別</span>
                {detailEvent.type ? typeLabel[detailEvent.type] ?? detailEvent.type : "ー"}
              </div>
              <div>
                <span className="label">開始</span>
                {new Date(detailEvent.startAt).toLocaleString("ja-JP")}
              </div>
              <div>
                <span className="label">終了</span>
                {new Date(detailEvent.endAt).toLocaleString("ja-JP")}
              </div>
              {detailEvent.customer && (
                <div>
                  <span className="label">顧客</span>
                  {detailEvent.customer.name}
                </div>
              )}
              {detailEvent.location && (
                <div>
                  <span className="label">場所</span>
                  {detailEvent.location}
                </div>
              )}
              {detailEvent.description && (
                <div>
                  <span className="label">説明</span>
                  {detailEvent.description}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="ghost" onClick={() => setShowDetail(false)}>
                閉じる
              </button>
              <button className="ghost" onClick={() => openEdit(detailEvent)}>
                編集
              </button>
              <button className="danger" onClick={() => handleDelete(detailEvent.id)}>
                削除
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="modal">
          <div className="modal-card">
            <h3>{formMode === "edit" ? "イベントを編集" : "イベントを作成"}</h3>
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
                  rows={3}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <label className="form-full">
                顧客
                <select
                  value={form.customerId}
                  onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value }))}
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
                onClick={() => {
                  setShowForm(false);
                  setFormError("");
                }}
              >
                キャンセル
              </button>
              <button className="primary" onClick={handleFormSubmit} disabled={formSubmitting}>
                {formSubmitting ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
