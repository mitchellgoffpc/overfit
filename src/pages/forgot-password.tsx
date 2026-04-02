import type { ReactElement, SubmitEvent } from "react";
import { useEffect, useState } from "react";
import { Link, Redirect } from "wouter";

import { testEmail } from "helpers";
import { loadAuth, requestPasswordReset, useAuthStore } from "stores/auth";

const inputClass = "rounded-[0.625rem] border border-brand-border bg-white px-3 py-2.5 text-sm outline-none"
  + " focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20";
const successMessage = "If an account exists for that email, you'll receive a reset link shortly.";

export default function ForgotPasswordRoute(): ReactElement {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status === "idle") { void loadAuth(); }
  }, [status]);

  if (status === "authenticated") {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    const emailError = testEmail(trimmedEmail);
    if (emailError) {
      setError(emailError);
      setSent(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    const result = await requestPasswordReset(trimmedEmail);
    setIsLoading(false);
    if (result.ok) {
      setSent(true);
    } else {
      setError(result.error);
      setSent(false);
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
            <h1 className="text-xl font-semibold">Reset your password</h1>
            <p className="mt-1 text-[0.8125rem] text-brand-textMuted">Enter your email and we&apos;ll send a secure reset link.</p>
          </div>
        </div>

        <form
          className="grid gap-3.5 rounded-[1.125rem] border border-brand-border bg-brand-surface p-5 shadow-soft"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          {error ? <div className="rounded-[0.625rem] border border-danger-border bg-danger-bg px-2.5 py-2 text-xs text-danger-text">{error}</div> : null}
          {sent ? <div className="rounded-[0.625rem] border border-brand-border bg-white px-2.5 py-2 text-xs text-brand-text">{successMessage}</div> : null}

          <label className="grid gap-1.5 text-[0.8125rem] font-medium text-brand-text">
            Email address
            <input
              className={inputClass}
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

          <button
            className="rounded-[0.625rem] bg-brand-accent px-3 py-2.5 font-semibold text-white shadow-soft disabled:cursor-wait disabled:opacity-70"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? "Sending link..." : "Send reset link"}
          </button>
        </form>

        <div className="text-center text-[0.8125rem] text-brand-textMuted">
          Back to sign in: <Link className="font-semibold text-brand-accentStrong no-underline" href="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
