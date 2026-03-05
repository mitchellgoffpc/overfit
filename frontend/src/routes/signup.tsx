import { API_VERSION, PASSWORD_HINT, USERNAME_HINT } from "@overfit/types";
import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface AuthResponse {
  session?: { token?: string };
}

interface AuthError {
  error?: string;
}

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

export default function SignupRoute(): ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as AuthError | null;
        const message = body?.error ?? `Sign up failed (${String(response.status)})`;
        setError(message);
        setIsLoading(false);
        return;
      }

      const body = (await response.json()) as AuthResponse;
      const token = body.session?.token;
      if (token) {
        localStorage.setItem("overfitSessionToken", token);
      }
      setIsLoading(false);
      void navigate("/");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Sign up failed";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth__shell">
        <div className="auth__brand">
          <div className="auth__logo">O</div>
          <div>
            <h1 className="auth__title">Create your account</h1>
            <p className="auth__subtitle">Set up a workspace in minutes.</p>
          </div>
        </div>

        <form
          className="auth__card"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          {error ? <div className="auth__error">{error}</div> : null}

          <label className="auth__field">
            Email address
            <input
              className="auth__input"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
              }}
            />
          </label>

          <label className="auth__field">
            Password
            <input
              className="auth__input"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
            <span className="auth__hint">{PASSWORD_HINT}</span>
          </label>

          <label className="auth__field">
            Username
            <input
              className="auth__input"
              type="text"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
              }}
            />
            <span className="auth__hint">{USERNAME_HINT}</span>
          </label>

          <button className="auth__button" type="submit" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="auth__footer">
          Already have an account? <Link className="auth__link" to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
