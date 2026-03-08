import {
  API_VERSION,
  EMAIL_IN_USE_ERROR,
  PASSWORD_HINT,
  USERNAME_HINT,
  USERNAME_IN_USE_ERROR,
  testEmail,
  testPassword,
  testHandle
} from "@underfit/types";
import type { SubmitEvent, ReactElement } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuthStore } from "store/auth";

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
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const loadUser = useAuthStore((state) => state.loadUser);
  const hasHintErrors = Boolean(emailHintError ?? usernameHintError ?? passwordHintError);

  const checkAvailability = async (
    path: string,
    param: "email" | "handle",
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
        const response = await fetch(`${apiBase}/${path}?${query.toString()}`);
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

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedUsername = username.trim();
    const nextEmailError = emailHintError ?? (trimmedEmail ? testEmail(trimmedEmail) : null);
    const nextPasswordError = passwordHintError ?? (password ? testPassword(password) : null);
    const nextUsernameError = usernameHintError ?? (trimmedUsername ? testHandle(trimmedUsername) : null);
    setEmailHintError(nextEmailError);
    setPasswordHintError(nextPasswordError);
    setUsernameHintError(nextUsernameError);
    if (nextEmailError || nextPasswordError || nextUsernameError) {
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBase}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, handle: username, password })
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
        localStorage.setItem("underfitSessionToken", token);
        clearAuth();
        void loadUser(token);
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
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#e6f1f1_0%,_#f2f6f6_45%,_#f7f8fc_100%)] px-4 py-8">
      <div className="grid w-full max-w-[420px] gap-5">
        <div className="grid place-items-center gap-2.5 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-brand-text text-[22px] text-white">
            <span className="font-display">U</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold">Create your account</h1>
            <p className="mt-1 text-[13px] text-brand-textMuted">Set up a workspace in minutes.</p>
          </div>
        </div>

        <form
          className="grid gap-3.5 rounded-[18px] border border-brand-border bg-brand-surface p-5 shadow-soft"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          {error ? <div className="rounded-[10px] border border-[#fecaca] bg-[#fee4e2] px-2.5 py-2 text-xs text-[#b42318]">{error}</div> : null}

          <label className="grid gap-1.5 text-[13px] font-medium text-brand-text">
            Email address
            <input
              className={emailHintError
                ? "rounded-[10px] border border-[#b42318] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b42318] focus:ring-2 focus:ring-[#b42318]/20"
                : "rounded-[10px] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"}
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
                    void checkAvailability("users/email-exists", "email", email, setEmailHintError, EMAIL_IN_USE_ERROR);
                  }
                }
              }}
            />
            <span className={emailHintError ? "text-xs font-medium text-[#b42318]" : "text-xs font-normal text-brand-textMuted"}>
              {emailHintError ?? ""}
            </span>
          </label>

          <label className="grid gap-1.5 text-[13px] font-medium text-brand-text">
            Password
            <input
              className={passwordHintError
                ? "rounded-[10px] border border-[#b42318] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b42318] focus:ring-2 focus:ring-[#b42318]/20"
                : "rounded-[10px] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"}
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
            <span className={passwordHintError ? "text-xs font-medium text-[#b42318]" : "text-xs font-normal text-brand-textMuted"}>
              {passwordHintError ?? PASSWORD_HINT}
            </span>
          </label>

          <label className="grid gap-1.5 text-[13px] font-medium text-brand-text">
            Username
            <input
              className={usernameHintError
                ? "rounded-[10px] border border-[#b42318] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#b42318] focus:ring-2 focus:ring-[#b42318]/20"
                : "rounded-[10px] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"}
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
                  const validationError = testHandle(trimmed);
                  setUsernameHintError(validationError);
                  if (!validationError) {
                    void checkAvailability("accounts/handle-exists", "handle", username, setUsernameHintError, USERNAME_IN_USE_ERROR);
                  }
                }
              }}
            />
            <span className={usernameHintError ? "text-xs font-medium text-[#b42318]" : "text-xs font-normal text-brand-textMuted"}>
              {usernameHintError ?? USERNAME_HINT}
            </span>
          </label>

          <button
            className="rounded-[10px] bg-brand-accent px-3 py-2.5 font-semibold text-white shadow-soft disabled:cursor-wait disabled:opacity-70"
            type="submit"
            disabled={isLoading || hasHintErrors}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="text-center text-[13px] text-brand-textMuted">
          Already have an account? <Link className="font-semibold text-brand-accentStrong no-underline" to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
