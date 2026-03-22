import { PASSWORD_HINT, USERNAME_HINT, testEmail, testPassword, testHandle } from "@underfit/types";
import type { SubmitEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { Link, Redirect, useLocation } from "wouter";

import { checkEmailValid, checkHandleValid, useAuthStore } from "stores/auth";

const inputErrorClass = "rounded-[0.625rem] border border-[#b42318] bg-white px-3 py-2.5 text-sm outline-none"
  + " focus:border-[#b42318] focus:ring-2 focus:ring-[#b42318]/20";
const inputNormalClass = "rounded-[0.625rem] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none"
  + " focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";

export default function SignupRoute(): ReactElement {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailHintError, setEmailHintError] = useState<string | null>(null);
  const [usernameHintError, setUsernameHintError] = useState<string | null>(null);
  const [passwordHintError, setPasswordHintError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const status = useAuthStore((state) => state.status);
  const loadAuth = useAuthStore((state) => state.loadAuth);
  const signup = useAuthStore((state) => state.signup);

  useEffect(() => {
    if (status === "idle") { void loadAuth(); }
  }, [loadAuth, status]);

  if (status === "authenticated") {
    return <Redirect to="/" />;
  }

  const handleEmailBlur = async () => {
    setEmailHintError(await checkEmailValid(email));
  };

  const handleUsernameBlur = async () => {
    setUsernameHintError(await checkHandleValid(username));
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextEmailError = emailHintError ?? testEmail(email.trim());
    const nextPasswordError = passwordHintError ?? testPassword(password);
    const nextUsernameError = usernameHintError ?? testHandle(username.trim());
    setEmailHintError(nextEmailError);
    setPasswordHintError(nextPasswordError);
    setUsernameHintError(nextUsernameError);

    if (!nextEmailError && !nextPasswordError && !nextUsernameError) {
      setError(null);
      setIsLoading(true);

      const result = await signup(email, username, password);
      if (result.ok) {
        setIsLoading(false);
        navigate("/");
      } else {
        setError(result.error);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top,_#e6f1f1_0%,_#f2f6f6_45%,_#f7f8fc_100%)] px-4 py-8">
      <div className="grid w-full max-w-[26.25rem] gap-5">
        <div className="grid place-items-center gap-2.5 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-[0.875rem] bg-brand-text text-[1.375rem] text-white">
            <span className="font-display">U</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold">Create your account</h1>
            <p className="mt-1 text-[0.8125rem] text-brand-textMuted">Set up a workspace in minutes.</p>
          </div>
        </div>

        <form
          className="grid gap-3.5 rounded-[1.125rem] border border-brand-border bg-brand-surface p-5 shadow-soft"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          {error ? <div className="rounded-[0.625rem] border border-[#fecaca] bg-[#fee4e2] px-2.5 py-2 text-xs text-[#b42318]">{error}</div> : null}

          <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
            Email address
            <input
              className={emailHintError ? inputErrorClass : inputNormalClass}
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
                void handleEmailBlur();
              }}
            />
            <span className={emailHintError ? "text-xs font-medium text-[#b42318]" : "text-xs font-normal text-brand-textMuted"}>
              {emailHintError ?? ""}
            </span>
          </label>

          <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
            Password
            <input
              className={passwordHintError ? inputErrorClass : inputNormalClass}
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
                setPasswordHintError(password ? testPassword(password) : null);
              }}
            />
            <span className={passwordHintError ? "text-xs font-medium text-[#b42318]" : "text-xs font-normal text-brand-textMuted"}>
              {passwordHintError ?? PASSWORD_HINT}
            </span>
          </label>

          <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
            Username
            <input
              className={usernameHintError ? inputErrorClass : inputNormalClass}
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
                void handleUsernameBlur();
              }}
            />
            <span className={usernameHintError ? "text-xs font-medium text-[#b42318]" : "text-xs font-normal text-brand-textMuted"}>
              {usernameHintError ?? USERNAME_HINT}
            </span>
          </label>

          <button
            className="rounded-[0.625rem] bg-brand-accent px-3 py-2.5 font-semibold text-white shadow-soft disabled:cursor-wait disabled:opacity-70"
            type="submit"
            disabled={isLoading || Boolean(emailHintError ?? usernameHintError ?? passwordHintError)}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <div className="text-center text-[0.8125rem] text-brand-textMuted">
          Already have an account? <Link className="font-semibold text-brand-accentStrong no-underline" href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
