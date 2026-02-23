import type { Dispatch, SetStateAction } from "react";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

type Props = {
  tenantId: string;
  setTenantId: Dispatch<SetStateAction<string>>;
  loginEmail: string;
  setLoginEmail: Dispatch<SetStateAction<string>>;
  loginPassword: string;
  setLoginPassword: Dispatch<SetStateAction<string>>;
  token: string;
  setToken: Dispatch<SetStateAction<string>>;
  loggingIn: boolean;
  error: string;
  onLogin: () => void;
};

export default function LoginPage({
  tenantId,
  setTenantId,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  token,
  setToken,
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
            <span className="label">Tenant ID</span>
            <input
              value={tenantId}
              onChange={(event) => setTenantId(event.target.value)}
              placeholder="Tenant ID"
            />
          </div>
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
          <div className="token-divider">or</div>
          <div>
            <span className="label">Access Token</span>
            <input
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste JWT access token"
            />
          </div>
          <p className="hint">API: {API_BASE}</p>
        </div>
      </header>
    </div>
  );
}
