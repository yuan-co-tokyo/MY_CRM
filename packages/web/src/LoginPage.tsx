import type { Dispatch, SetStateAction } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

type Props = {
  loginEmail: string;
  setLoginEmail: Dispatch<SetStateAction<string>>;
  loginPassword: string;
  setLoginPassword: Dispatch<SetStateAction<string>>;
  loggingIn: boolean;
  error: string;
  onLogin: () => void;
};

export default function LoginPage({
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  loggingIn,
  error,
  onLogin,
}: Props) {
  return (
    <div className="app">
      <div className="backdrop" />
      <header className="hero">
        <div>
          <p className="eyebrow">MY CRM • Access Studio</p>
          <h1>権限と顧客を、ひとつの操作空間で。</h1>
          <p className="lead">
            権限はロールに集約、顧客は担当とステータスで即時に切り替え。
            学習用途でも運用を意識した管理体験を追求します。
          </p>
        </div>
        <div className="token-card">
          <div>
            <span className="label">Email</span>
            <input
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <span className="label">Password</span>
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onLogin();
              }}
              placeholder="********"
            />
          </div>
          <button className="primary" onClick={onLogin} disabled={loggingIn}>
            {loggingIn ? "Signing in..." : "Sign in"}
          </button>
          {error && <div className="global-error">{error}</div>}
          <p className="hint">API: {API_BASE}</p>
        </div>
      </header>
    </div>
  );
}
