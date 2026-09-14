import { useState, type FormEvent } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export default function SignIn({ upgrading = false }: { upgrading?: boolean }) {
  const { signIn } = useAuthActions();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      const result = await signIn("email-code", {
        email: email.trim().toLowerCase(),
        ...(sent
          ? { code: String(data.get("code")).trim().toLowerCase() }
          : {}),
      });
      if (!sent) setSent(true);
      else if (result.signingIn) window.location.reload();
      else if (!result.signingIn)
        setError("That code could not be verified. Check it and try again.");
    } catch {
      setError(
        sent
          ? "That code is invalid or expired. Try again or request a new code."
          : "We could not send a code. Check your email address or wait a minute before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="form-panel account-panel">
      <h2>
        {upgrading
          ? "Keep your events. Unlock live enquiries."
          : "Your event starts here."}
      </h2>
      <p>
        {upgrading
          ? "Verify your email to keep this workspace when you change devices."
          : "Sign in with your email to save events and contact venues. No password or invitation needed."}
      </p>
      <form onSubmit={submit} aria-busy={busy}>
        <label>
          Email address
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
            value={email}
            disabled={sent || busy}
            aria-invalid={!sent && Boolean(error)}
            aria-describedby={!sent && error ? "signin-error" : undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="you@example.com"
          />
        </label>
        {sent && (
          <>
            <p role="status">
              Check {email} for your sign-in code. It expires in 10 minutes.
            </p>
            <label>
              Sign-in code
              <input
                name="code"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "signin-error" : undefined}
                onChange={() => setError("")}
                autoComplete="one-time-code"
                autoFocus
                required
                type="password"
                inputMode="numeric"
                minLength={8}
                maxLength={8}
                placeholder="Paste your 8-digit code"
              />
            </label>
          </>
        )}
        <button disabled={busy}>
          {busy
            ? "Please wait…"
            : sent
              ? "Verify & open my events"
              : "Email me a sign-in code"}
        </button>
        {sent && (
          <button
            className="quiet"
            type="button"
            disabled={busy}
            onClick={() => {
              setSent(false);
              setError("");
            }}
          >
            Change email or request a new code
          </button>
        )}
        {error && (
          <p id="signin-error" role="alert" className="error">
            {error}
          </p>
        )}
      </form>
      <p className="note">
        Public trial: contact up to 3 venues per event and send 5 enquiries a
        day. You approve each enquiry. Venue response times vary.
      </p>
    </section>
  );
}
