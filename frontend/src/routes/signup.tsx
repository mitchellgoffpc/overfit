import {
  API_VERSION,
  EMAIL_IN_USE_ERROR,
  PASSWORD_HINT,
  USERNAME_HINT,
  USERNAME_IN_USE_ERROR,
  testEmail,
  testPassword,
  testUsername
} from "@overfit/types";
import type { FormEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface AuthResponse {
  session?: { token?: string };
}

interface AuthError {
  error?: string;
}

interface ExistsResponse {
  exists?: boolean;
}

const apiBase = `http://localhost:4000/api/${API_VERSION}`;

export default function SignupRoute(): ReactElement {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailHintError, setEmailHintError] = useState<string | null>(null);
  const [usernameHintError, setUsernameHintError] = useState<string | null>(null);
  const [passwordHintError, setPasswordHintError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const checkAvailability = async (
    path: string,
    param: "email" | "username",
    value: string,
    setHintError: (message: string | null) => void,
    conflictMessage: string
  ) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setHintError(null);
    } else {
      try {
        const query = new URLSearchParams({ [param]: trimmed });
        const response = await fetch(`${apiBase}/users/${path}?${query.toString()}`);
        if (!response.ok) {
          setHintError(`Unable to verify ${param}`);
          return;
        }
        const body = (await response.json().catch(() => null)) as ExistsResponse | null;
        setHintError(body?.exists ? conflictMessage : null);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : `Unable to verify ${param}`;
        setHintError(message);
      }
    }
  };

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
              className={`auth__input${emailHintError ? " auth__input--error" : ""}`}
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailHintError(null);
              }}
              onBlur={() => {
                const trimmed = email.trim();
                if (!trimmed) {
                  setEmailHintError(null);
                } else {
                  const validationError = testEmail(trimmed);
                  setEmailHintError(validationError);
                  if (!validationError) {
                    void checkAvailability("email-exists", "email", email, setEmailHintError, EMAIL_IN_USE_ERROR);
                  }
                }
              }}
            />
            <span className={`auth__hint${emailHintError ? " auth__hint--error" : ""}`}>{emailHintError ?? ""}</span>
          </label>

          <label className="auth__field">
            Password
            <input
              className={`auth__input${passwordHintError ? " auth__input--error" : ""}`}
              type="password"
              name="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordHintError(null);
              }}
              onBlur={() => {
                if (!password) {
                  setPasswordHintError(null);
                } else {
                  setPasswordHintError(testPassword(password));
                }
              }}
            />
            <span className={`auth__hint${passwordHintError ? " auth__hint--error" : ""}`}>{passwordHintError ?? PASSWORD_HINT}</span>
          </label>

          <label className="auth__field">
            Username
            <input
              className={`auth__input${usernameHintError ? " auth__input--error" : ""}`}
              type="text"
              name="username"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setUsernameHintError(null);
              }}
              onBlur={() => {
                const trimmed = username.trim();
                if (!trimmed) {
                  setUsernameHintError(null);
                } else {
                  const validationError = testUsername(trimmed);
                  setUsernameHintError(validationError);
                  if (!validationError) {
                    void checkAvailability("username-exists", "username", username, setUsernameHintError, USERNAME_IN_USE_ERROR);
                  }
                }
              }}
            />
            <span className={`auth__hint${usernameHintError ? " auth__hint--error" : ""}`}>{usernameHintError ?? USERNAME_HINT}</span>
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
