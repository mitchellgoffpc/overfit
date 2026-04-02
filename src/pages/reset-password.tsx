import type { ReactElement, SubmitEvent } from "react";
import { useEffect, useState } from "react";
import { Link, Redirect } from "wouter";

import { PASSWORD_HINT, testPassword } from "helpers";
import { completePasswordReset, loadAuth, useAuthStore } from "stores/auth";

const inputErrorClass = "rounded-[0.625rem] border border-danger-text bg-white px-3 py-2.5 text-sm outline-none"
  + " focus:border-danger-text focus:ring-2 focus:ring-danger-text/20";
const inputNormalClass = "rounded-[0.625rem] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none"
  + " focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";

export default function ResetPasswordRoute(): ReactElement {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get("token") ?? "");
  const [password, setPassword] = useState("");
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "idle") { void loadAuth(); }
  }, [status]);

  if (status === "authenticated") {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedToken = token.trim();
    const nextTokenError = trimmedToken ? null : "Reset token is required";
    const nextPasswordError = testPassword(password);
    setTokenError(nextTokenError);
    setPasswordError(nextPasswordError);
    if (nextTokenError || nextPasswordError) { return; }

    setError(null);
    setIsLoading(true);
    const result = await completePasswordReset(trimmedToken, password);
    setIsLoading(false);
    if (result.ok) {
      setIsReset(true);
    } else {
      setError(result.error);
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
            <h1 className="text-xl font-semibold">Choose a new password</h1>
            <p className="mt-1 text-[0.8125rem] text-brand-textMuted">Set a new password for your Underfit account.</p>
          </div>
        </div>

        {isReset ? (
          <div className="grid gap-3.5 rounded-[1.125rem] border border-brand-border bg-brand-surface p-5 text-center shadow-soft">
            <p className="text-sm text-brand-text">Your password was reset successfully.</p>
            <Link className="rounded-[0.625rem] bg-brand-accent px-3 py-2.5 font-semibold text-white no-underline shadow-soft" href="/login">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form
            className="grid gap-3.5 rounded-[1.125rem] border border-brand-border bg-brand-surface p-5 shadow-soft"
            onSubmit={(event) => {
              void handleSubmit(event);
            }}
          >
            {error ? <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-2.5 py-2 text-xs text-danger-text">{error}</div> : null}

            <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
              Reset token
              <input
                className={tokenError ? inputErrorClass : inputNormalClass}
                type="text"
                name="token"
                required
                value={token}
                onChange={(event) => {
                  setToken(event.target.value);
                  setTokenError(null);
                }}
              />
              <span className={tokenError ? "text-xs font-medium text-danger-text" : "text-xs font-normal text-brand-textMuted"}>
                {tokenError ?? ""}
              </span>
            </label>

            <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
              New password
              <input
                className={passwordError ? inputErrorClass : inputNormalClass}
                type="password"
                name="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setPasswordError(null);
                }}
                onBlur={() => {
                  setPasswordError(password ? testPassword(password) : null);
                }}
              />
              <span className={passwordError ? "text-xs font-medium text-danger-text" : "text-xs font-normal text-brand-textMuted"}>
                {passwordError ?? PASSWORD_HINT}
              </span>
            </label>

            <button
              className="rounded-[0.625rem] bg-brand-accent px-3 py-2.5 font-semibold text-white shadow-soft disabled:cursor-wait disabled:opacity-70"
              type="submit"
              disabled={isLoading || Boolean(tokenError ?? passwordError)}
            >
              {isLoading ? "Updating password..." : "Update password"}
            </button>
          </form>
        )}

        <div className="text-center text-[0.8125rem] text-brand-textMuted">
          Remembered your password? <Link className="font-semibold text-brand-accentStrong no-underline" href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
