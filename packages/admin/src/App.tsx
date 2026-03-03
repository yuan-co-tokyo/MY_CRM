import { useEffect, useState } from "react";
import "./style.css";
import TenantsPage from "./TenantsPage.tsx";
import UsersPage from "./UsersPage.tsx";

type ViewKey = "tenants" | "users";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

export async function apiFetch<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("admin_token") ?? "");
  const [view, setView] = useState<ViewKey>("tenants");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) localStorage.setItem("admin_token", token);
    else localStorage.removeItem("admin_token");
  }, [token]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoading(true);
    try {
      const { accessToken } = await apiFetch<{ accessToken: string }>(
        "/auth/login",
        "",
        {
          method: "POST",
          body: JSON.stringify({ email, password })
        }
      );
      const me = await apiFetch<{ userType: string }>("/auth/me", accessToken);
      if (me.userType !== "SUPER_ADMIN") {
        setLoginError("アクセス権限がありません。スーパーアドミンアカウントでログインしてください。");
        return;
      }
      setToken(accessToken);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setToken("");
    setView("tenants");
  }

  if (!token) {
    return (
      <div className="app">
        <div className="backdrop" />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "20px"
          }}
        >
          <div className="modal-card" style={{ maxWidth: 400, width: "100%" }}>
            <div>
              <p className="eyebrow" style={{ margin: "0 0 4px" }}>MY CRM</p>
              <h2 style={{ margin: 0 }}>管理者ログイン</h2>
            </div>
            {loginError && <div className="global-error">{loginError}</div>}
            <form onSubmit={(e) => void handleLogin(e)} className="form-grid">
              <div>
                <p className="label">メールアドレス</p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <p className="label">パスワード</p>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="primary" disabled={loading}>
                {loading ? "ログイン中…" : "ログイン"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="backdrop" />
      <div className="shell">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <p className="eyebrow" style={{ margin: 0 }}>MY CRM</p>
            <p style={{ margin: "4px 0 0", fontWeight: 700, fontSize: 15 }}>Admin</p>
          </div>
          <nav className="sidebar-nav">
            <button
              className={`sidebar-item${view === "tenants" ? " active" : ""}`}
              onClick={() => setView("tenants")}
            >
              テナント管理
            </button>
            <button
              className={`sidebar-item${view === "users" ? " active" : ""}`}
              onClick={() => setView("users")}
            >
              ユーザー管理
            </button>
          </nav>
          <div className="sidebar-footer">
            <button className="sidebar-item" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        </aside>
        <main className="main-content">
          {view === "tenants" && <TenantsPage token={token} />}
          {view === "users" && <UsersPage token={token} />}
        </main>
      </div>
    </div>
  );
}
