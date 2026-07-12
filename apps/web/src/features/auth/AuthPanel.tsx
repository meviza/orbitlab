import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { User } from "@orbitlab/domain";
import { useContainer, useLocale } from "../../app/providers";
import { t } from "../../shared/i18n/messages";
import { Button } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";

/** Guest shell in memory mode; sign-in / sign-up via AuthPort in PocketBase mode. */
export function AuthPanel() {
  const { auth, backend, guestUser } = useContainer();
  const { locale } = useLocale();

  const [user, setUser] = useState<User | null>(guestUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const result = await auth.currentUser();
    if (result.ok) {
      setUser(result.value);
    }
  }, [auth]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  if (backend === "memory") {
    return (
      <Card title={t(locale, "authGuest")}>
        <p style={{ margin: 0, fontSize: "0.88rem" }}>{t(locale, "authNote")}</p>
        <div
          className="row"
          style={{
            marginTop: "0.75rem",
            padding: "0.55rem 0.75rem",
            background: "var(--bg-hover)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--success)",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "0.88rem" }}>
            {guestUser?.email ?? "guest"} · {guestUser?.plan ?? "free"} plan
          </span>
        </div>
      </Card>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        const result = await auth.signIn({ email, password });
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setUser(result.value);
        setInfo(t(locale, "authSignedIn"));
        setPassword("");
      } else {
        const result = await auth.signUp({
          email,
          password,
          displayName: displayName.trim() || undefined,
        });
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        setUser(result.value);
        setInfo(t(locale, "authSignedUp"));
        setPassword("");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const result = await auth.signOut();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setUser(null);
      setInfo(t(locale, "authSignedOut"));
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <Card title={t(locale, "authAccount")}>
        <div
          className="row"
          style={{
            padding: "0.55rem 0.75rem",
            background: "var(--bg-hover)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            marginBottom: "0.75rem",
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "var(--success)",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: "0.88rem" }}>
            {user.email} · {user.plan} plan
          </span>
        </div>
        {info ? (
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "var(--success)" }}>
            {info}
          </p>
        ) : null}
        {error ? (
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.85rem", color: "var(--danger)" }}>
            {error}
          </p>
        ) : null}
        <Button variant="secondary" onClick={() => void handleSignOut()} disabled={busy}>
          {t(locale, "authSignOut")}
        </Button>
      </Card>
    );
  }

  return (
    <Card title={mode === "signin" ? t(locale, "authSignIn") : t(locale, "authSignUp")}>
      <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem" }}>
        {t(locale, "authPbNote")}
      </p>
      <form className="stack" style={{ gap: "0.65rem" }} onSubmit={(e) => void handleSubmit(e)}>
        {mode === "signup" ? (
          <label className="stack" style={{ gap: "0.25rem", fontSize: "0.85rem" }}>
            <span className="faint">{t(locale, "authDisplayName")}</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
              style={inputStyle}
            />
          </label>
        ) : null}
        <label className="stack" style={{ gap: "0.25rem", fontSize: "0.85rem" }}>
          <span className="faint">{t(locale, "authEmail")}</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            style={inputStyle}
          />
        </label>
        <label className="stack" style={{ gap: "0.25rem", fontSize: "0.85rem" }}>
          <span className="faint">{t(locale, "authPassword")}</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            style={inputStyle}
          />
        </label>

        {error ? (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--danger)" }}>{error}</p>
        ) : null}
        {info ? (
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--success)" }}>{info}</p>
        ) : null}

        <div className="row" style={{ flexWrap: "wrap", marginTop: "0.25rem" }}>
          <Button variant="primary" type="submit" disabled={busy}>
            {busy
              ? t(locale, "authWorking")
              : mode === "signin"
                ? t(locale, "authSignIn")
                : t(locale, "authSignUp")}
          </Button>
          <Button
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={() => {
              setMode((m) => (m === "signin" ? "signup" : "signin"));
              setError(null);
              setInfo(null);
            }}
          >
            {mode === "signin" ? t(locale, "authNeedAccount") : t(locale, "authHaveAccount")}
          </Button>
        </div>
      </form>
    </Card>
  );
}

const inputStyle = {
  width: "100%",
  padding: "0.45rem 0.6rem",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
} as const;
