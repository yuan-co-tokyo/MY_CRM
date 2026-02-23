import { useEffect, useState } from "react";

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

type DashboardStats = {
  totalCustomers: number;
  leadCount: number;
  activeCount: number;
  inactiveCount: number;
  totalInteractions: number;
  activeUsers: number;
};

type Props = {
  token: string;
};

export default function DashboardPage({ token }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    apiFetch<DashboardStats>("/dashboard/stats", token)
      .then((data) => {
        setStats(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "予期しないエラーが発生しました");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return <p className="muted">読み込み中...</p>;
  }

  if (error) {
    return <div className="global-error">{error}</div>;
  }

  if (!stats) {
    return null;
  }

  return (
    <main className="layout">
      <section className="panel">
        <div className="panel-header">
          <h2>顧客統計</h2>
          <span className="chip">{stats.totalCustomers} 件</span>
        </div>
        <div>
          <p className="label">顧客合計</p>
          <p className="chip">{stats.totalCustomers}</p>
        </div>
        <div>
          <p className="label">リード</p>
          <p className="chip status-lead">{stats.leadCount}</p>
        </div>
        <div>
          <p className="label">アクティブ</p>
          <p className="chip status-active">{stats.activeCount}</p>
        </div>
        <div>
          <p className="label">非アクティブ</p>
          <p className="chip status-inactive">{stats.inactiveCount}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>アクティビティ</h2>
        </div>
        <div>
          <p className="label">インタラクション合計</p>
          <p className="chip">{stats.totalInteractions}</p>
        </div>
        <div>
          <p className="label">アクティブユーザー</p>
          <p className="chip status-active">{stats.activeUsers}</p>
        </div>
      </section>
    </main>
  );
}
