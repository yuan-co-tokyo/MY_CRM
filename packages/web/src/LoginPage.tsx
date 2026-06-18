import { useState, type Dispatch, type SetStateAction } from "react";

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
  const [showPw, setShowPw] = useState(false);

  return (
    <main className="login-v2-page">
      <div className="login-v2-orb login-v2-orb--primary" />
      <div className="login-v2-orb login-v2-orb--secondary" />

      <div className="login-v2-brand" aria-label="MY CRM">
        <span className="login-v2-brand-mark" aria-hidden="true" />
        <span className="login-v2-brand-text">MY CRM</span>
      </div>

      <section className="login-v2-card" aria-labelledby="login-v2-title">
        <div className="login-v2-heading">
          <p className="login-v2-eyebrow">Insurance Agency CRM</p>
          <h1 id="login-v2-title" className="login-v2-title">
            ログイン
          </h1>
        </div>

        {error && (
          <div className="login-v2-error" role="alert">
            <span className="login-v2-error-icon" aria-hidden="true">
              !
            </span>
            <span>{error}</span>
          </div>
        )}

        <div className="login-v2-field login-v2-field--email">
          <label className="login-v2-label" htmlFor="login-v2-email">
            メールアドレス
          </label>
          <input
            id="login-v2-email"
            className="login-v2-input"
            type="email"
            value={loginEmail}
            onChange={(event) => setLoginEmail(event.target.value)}
            placeholder="admin@example.com"
            autoComplete="email"
          />
        </div>

        <div className="login-v2-field login-v2-field--password">
          <div className="login-v2-password-head">
            <label className="login-v2-label" htmlFor="login-v2-password">
              パスワード
            </label>
            <button
              className="login-v2-password-toggle"
              type="button"
              onClick={() => setShowPw((current) => !current)}
            >
              {showPw ? "非表示" : "表示"}
            </button>
          </div>
          <input
            id="login-v2-password"
            className="login-v2-input"
            type={showPw ? "text" : "password"}
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onLogin();
            }}
            placeholder="パスワードを入力"
            autoComplete="current-password"
          />
        </div>

        <div className="login-v2-options">
          <label className="login-v2-remember">
            <input
              className="login-v2-checkbox"
              type="checkbox"
              aria-label="ログイン状態を保持"
            />
            <span>ログイン状態を保持</span>
          </label>
          <a className="login-v2-help-link" href="#password-reset">
            パスワードをお忘れですか？
          </a>
        </div>

        <button
          className="login-v2-submit"
          type="button"
          onClick={onLogin}
          disabled={loggingIn}
        >
          {loggingIn ? "サインイン中…" : "ログイン"}
        </button>

        <div className="login-v2-secure">
          <span className="login-v2-secure-dot" aria-hidden="true" />
          <span>SSL暗号化により通信は保護されています</span>
        </div>
      </section>

      <footer className="login-v2-footer">
        © 2026 MY CRM ・ 総合保険代理店 業務支援システム
      </footer>
    </main>
  );
}
