import { useState } from "react";
import { BrainCircuit, ShieldCheck } from "lucide-react";
import { login, register, getCurrentUser } from "../api";

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        await register(email.trim(), password);
      }
      await login(email.trim(), password);
      const user = await getCurrentUser();
      onAuthenticated(user);
    } catch (err) {
      setError(err.message || "Unable to authenticate.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <div className="brand auth-brand">
          <span className="brand-mark">
            <BrainCircuit size={23} />
          </span>
          <span>
            <strong>LeadFlow</strong>
            <small>AI WORKSPACE</small>
          </span>
        </div>
        <span className="section-kicker">YOUR SALES COMMAND CENTER</span>
        <h1>{mode === "login" ? "Welcome back." : "Create your workspace."}</h1>
        <p className="page-subtitle">
          {mode === "login"
            ? "Sign in to manage your leads and AI workflows."
            : "Create an account to start managing your leads."}
        </p>
        <form className="lead-form" onSubmit={submit}>
          <label>
            Email address
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={12}
              maxLength={128}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 12 characters"
            />
          </label>
          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button full-button" disabled={busy} type="submit">
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          {mode === "login" ? "New to LeadFlow?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
        <p className="auth-security">
          <ShieldCheck size={15} /> Your leads are protected by account-based access.
        </p>
      </section>
    </main>
  );
}

export default AuthScreen;
