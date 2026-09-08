import { useEffect, useState, type FormEvent } from "react";
import {
  useConvexAuth,
  useQuery,
  useMutation,
  useConvexConnectionState,
} from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { ConvexError } from "convex/values";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import Board from "./Board";
import Landing from "./Landing";
import SignIn from "./SignIn";
import demoReplies from "./demoReplies.json";
import { demoRows, demoEvent } from "./demoData";
import "./index.css";
const describe = (e: unknown) => {
  if (e instanceof ConvexError) {
    if (typeof e.data === "string") return e.data;
    if (e.data && typeof e.data === "object" && "kind" in e.data && e.data.kind === "RateLimited")
      return "This trial allowance has been used. Please try again after the daily limit resets.";
  }
  return "That could not be saved. Check your connection and try again.";
};
function Demo() {
  const [selected, setSelected] = useState<string | null>(null);
  const reply = demoReplies.find(r => r.id === selected);
  useEffect(() => { if (reply) document.getElementById("mock-reply")?.scrollIntoView({block:"start"}); }, [reply]);
  return (
    <>
      <div className="banner">
        <strong>Example comparison</strong>
        <span>
          Mock data only. Explore fictional venue quotes. No emails are sent and nothing is saved to your workspace.
        </span>
      </div>
      <h1>
        Every quote.
        <br />
        The same guest count.
      </h1>
      <p className="intro">
        A per-plate price, a fixed package, a hall with a food minimum. Put them
        on one table, and see what each actually costs.
      </p>
      <Board
        initialHeadcount={demoEvent.defaultHeadcount}
        onSelect={setSelected}
        selectLabel="Read mock reply"
        rows={demoRows.map((r) => ({
          id: r.id,
          name: r.vendorName,
          quote: r.quote,
        }))}
      />
      {reply && <section id="mock-reply" className="demo-reply" aria-label="Mock original reply"><div className="section-heading"><h2>{reply.subject}</h2><button className="quiet" onClick={() => setSelected(null)}>Close mock reply</button></div><p className="note">Fictional example · This message was never sent to a venue.</p><pre>{reply.body}</pre></section>}
    </>
  );
}
export default function App() {
  const readMode = () => location.hash === "#demo" ? "demo" : location.hash === "#workspace" ? "live" : "home";
  const [mode, updateMode] = useState(readMode);
  const setMode = (value: string) => { location.hash = value === "live" ? "workspace" : value === "demo" ? "demo" : ""; };
  useEffect(() => { const sync = () => { updateMode(readMode()); if (["#demo", "#workspace", ""].includes(location.hash)) window.scrollTo(0, 0); }; window.addEventListener("hashchange", sync); return () => window.removeEventListener("hashchange", sync); }, []);
  const configured = !!import.meta.env.VITE_CONVEX_URL;
  return (
    <main className={`wrap ${mode === "home" ? "landing-shell" : ""}`} id="main">
      <header className="masthead">
        <a className="wordmark" href="/">
          One Table<span>VENUE QUOTES, COMPARED.</span>
        </a>
        <nav aria-label="Workspace">
          <a href="#demo" className={mode === "demo" ? "active" : "quiet"}>See how it works</a>
          <a href="#workspace" className={mode === "live" ? "active" : "quiet"}>My events</a>
        </nav>
      </header>
      {mode === "home" ? <Landing /> : mode === "demo" ? (
        <>
          <Demo />
          <div className="start-strip">
            <div>
              <h2>Bring your own quotes.</h2>
              <p>
                Create a private event, find venues and compare their replies.
              </p>
            </div>
            <button onClick={() => setMode("live")}>
              Start your comparison →
            </button>
          </div>
        </>
      ) : configured ? (
        <Workspace />
      ) : (
        <div className="empty">
          <h1>Backend setup needed.</h1>
          <p>
            Configure VITE_CONVEX_URL to create a private event. The example
            board remains available.
          </p>
        </div>
      )}
      <footer>
        <span>One Table · A clearer view of your venue quotes.</span>
        <span>Early pilot · Review original replies before booking. <a href="#workspace">My events</a></span>
      </footer>
    </main>
  );
}
function Workspace() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  if (isLoading) return <p role="status">Restoring your private workspace…</p>;
  if (!isAuthenticated) return <SignIn />;
  return <EventWorkspace />;
}
function EventWorkspace() {
  const account = useQuery(api.account.current);
  const { signOut } = useAuthActions();
  const events = useQuery(api.events.list);
  const config = useQuery(api.events.configuration);
  const create = useMutation(api.events.create);
  const connection = useConvexConnectionState();
  const [id, setId] = useState<Id<"events"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const d = new FormData(e.currentTarget);
    try {
      setId(
        await create({
          title: String(d.get("title")),
          city: String(d.get("city")),
          eventDate: String(d.get("date")),
          headcount: Number(d.get("count")),
          dietary: "veg",
        }),
      );
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {account && !account.verified && <SignIn upgrading />}
      {account?.verified && <div className="section-heading account-bar"><span>{account.email} · Email verified</span><button className="quiet" onClick={()=>void signOut()}>Sign out</button></div>}
      <div className="live-status">
        <span className={connection.isWebSocketConnected ? "connected" : ""}>
          {connection.isWebSocketConnected
            ? "Connected to Convex"
            : "Reconnecting…"}
        </span>
        <span>
          {config?.extraction
            ? "OpenAI extraction configured"
            : "Extraction unavailable"}{" "}
          ·{" "}
          {config?.discovery
            ? "Venue search configured"
            : "Venue search unavailable"}
        </span>
      </div>
      {id ? (
        <>
          <button className="quiet back" onClick={() => setId(null)}>
            ← All events
          </button>
          <LiveEvent key={id} id={id} />
        </>
      ) : (
        <>
          <h1>
            Your next gathering,
            <br />
            with the numbers in order.
          </h1>
          <p className="intro">
            Start with the occasion and guest count. You review every enquiry
            before it is sent.
          </p>
          {events === undefined ? (
            <p role="status">Loading your events…</p>
          ) : (
            events.length > 0 && (
              <section className="event-list" aria-label="Saved events">
                {events.map((e) => (
                  <button key={e.id} onClick={() => setId(e.id)}>
                    <strong>{e.title}</strong>
                    <span>{e.city} →</span>
                  </button>
                ))}
              </section>
            )
          )}
          <form className="form-panel" onSubmit={submit}>
            <h2>Create an event</h2>
            <div className="fields">
              <label>
                Occasion
                <input
                  name="title"
                  required
                  maxLength={100}
                  placeholder="Family reception"
                />
              </label>
              <label>
                City
                <input
                  name="city"
                  required
                  maxLength={80}
                  placeholder="Mumbai"
                />
              </label>
              <label>
                Event date
                <input name="date" required type="date" />
              </label>
              <label>
                Guests
                <input
                  name="count"
                  required
                  type="number"
                  min={1}
                  max={2000}
                  defaultValue={120}
                />
              </label>
            </div>
            <button disabled={busy || !connection.isWebSocketConnected}>
              {busy ? "Creating…" : "Create private event"}
            </button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </form>
        </>
      )}
    </>
  );
}
function LiveEvent({ id }: { id: Id<"events"> }) {
  const board = useQuery(api.board.forEvent, { eventId: id });
  const discover = useMutation(api.events.discover);
  const add = useMutation(api.vendors.add);
  const [selected, setSelected] = useState<Id<"vendors"> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function addVenue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setBusy(true);
    setError("");
    try {
      const vendor = await add({
        eventId: id,
        name: String(d.get("name")),
        email: String(d.get("email")),
      });
      form.reset();
      setSelected(vendor);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }
  if (!board) return <p role="status">Loading the comparison…</p>;
  return (
    <>
      <h1>{board.event.title}</h1>
      <p className="sub">
        {board.event.city} · {board.event.eventDate} · {board.rows.length}{" "}
        venues
      </p>
      <section className="venue-tools">
        <div>
          <h2>Build your shortlist.</h2>
          <p>
            Search returns contact leads. Check each source before requesting a
            quote.
          </p>
          <button
            disabled={busy || board.event.discoveryStatus === "searching"}
            onClick={async () => {
              setError("");
              setBusy(true);
              try {
                await discover({ eventId: id });
              } catch (e) {
                setError(describe(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            {board.event.discoveryStatus === "searching"
              ? "Searching venue websites…"
              : "Find venues with Firecrawl"}
          </button>
          {board.event.discoveryError && (
            <p className="error" role="alert">
              {board.event.discoveryError}
            </p>
          )}
        </div>
        <form onSubmit={addVenue}>
          <h3>Or add a venue you know</h3>
          <label>
            Venue name
            <input
              required
              name="name"
              maxLength={120}
              placeholder="Venue name"
            />
          </label>
          <label>
            Contact email
            <input
              required
              type="email"
              name="email"
              placeholder="events@venue.com"
            />
          </label>
          <button className="secondary" disabled={busy}>
            Add venue
          </button>
        </form>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Board
        initialHeadcount={board.headcount}
        onSelect={(s) => setSelected(s as Id<"vendors">)}
        rows={board.rows.map((r) => ({
          id: r.vendorId,
          name: r.vendorName,
          quote: r.quote,
          sourceUrl: r.sourceUrl,
          status: r.status,
          pricingFlag: r.pricingFlag,
        }))}
      />
      {selected && (
        <ReplyDesk
          key={selected}
          vendorId={selected}
          event={board.event}
          name={
            board.rows.find((r) => r.vendorId === selected)?.vendorName ??
            "Venue"
          }
          email={board.rows.find((r) => r.vendorId === selected)?.email ?? ""}
          autoFollowup={board.rows.find(r=>r.vendorId===selected)?.autoFollowup ?? false}
          followupState={board.rows.find(r=>r.vendorId===selected)?.followupState ?? null}
          followupError={board.rows.find(r=>r.vendorId===selected)?.followupError ?? null}
          deliveryState={board.rows.find((r) => r.vendorId === selected)?.deliveryState ?? null}
          deliveryError={board.rows.find((r) => r.vendorId === selected)?.deliveryError ?? null}
          close={() => setSelected(null)}
        />
      )}
    </>
  );
}
function ReplyDesk({
  vendorId,
  name,
  email,
  event,
  close,
  deliveryState,
  deliveryError,
  autoFollowup,
  followupState,
  followupError,
}: {
  vendorId: Id<"vendors">;
  name: string;
  email: string;
  event: { title: string; city: string; headcount: number; eventDate: string };
  close: () => void;
  deliveryState: string | null;
  deliveryError: string | null;
  autoFollowup: boolean;
  followupState: string | null;
  followupError: string | null;
}) {
  useEffect(() => {
    const heading = document.getElementById("reply-desk-title");
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "start",
    });
  }, [vendorId]);
  const messages = useQuery(api.messages.list, { vendorId });
  const add = useMutation(api.messages.addReply);
  const retry = useMutation(api.messages.retry);
  const send = useMutation(api.vendors.approveRfq);
  const setAuto = useMutation(api.vendors.setAutoFollowup);
  const [allowFollowup, setAllowFollowup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const d = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await add({
        vendorId,
        subject: String(d.get("subject")),
        body: String(d.get("body")),
        operationId: crypto.randomUUID(),
      });
      form.reset();
      setNotice("Reply saved. OpenAI is extracting the quote.");
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="reply-desk" aria-label={`${name} replies`}>
      <div className="section-heading">
        <div>
          <h2 id="reply-desk-title" tabIndex={-1}>
            {name}
          </h2>
          <p>{email}</p>
        </div>
        <button className="quiet" onClick={close}>
          Close replies
        </button>
      </div>
      {deliveryState && <p role="status">Enquiry: {deliveryState}. {deliveryError}</p>}
      {followupState && <p role="status">Clarification: {followupState}. {followupError}</p>}
      {deliveryState && <label className="followup-choice"><input type="checkbox" checked={autoFollowup} disabled={busy || ["sent", "uncertain", "sending"].includes(followupState ?? "")} onChange={async e=>{setBusy(true);try{await setAuto({vendorId,enabled:e.target.checked})}catch(e){setError(describe(e))}finally{setBusy(false)}}} />Allow one automatic clarification after the next quote. No bookings or negotiations.</label>}
      <details className="enquiry">
        <summary>Review enquiry before sending</summary>
        <p>
          <strong>To:</strong> {email}
        </p>
        <p>
          Hello, I am pricing a {event.title.toLowerCase()} in {event.city} on{" "}
          {event.eventDate} for {event.headcount} guests (veg).
        </p>
        <p>
          Could you send your rate for that date, and confirm whether it
          includes taxes, what the minimum cover count is, and how far ahead you
          need confirmation?
        </p>
        <p>
          I am comparing a few venues on the same basis, so a per-guest figure
          is ideal. Thanks.
        </p>
        <p className="note">
          Verify your email to send. Public trial: 3 venues per event, 5 enquiries per day. Replies arrive here when venues respond.
        </p>
        {!deliveryState && <label className="followup-choice"><input type="checkbox" checked={allowFollowup} onChange={e=>setAllowFollowup(e.target.checked)} />If terms are missing, send one clarification in this thread about taxes, minimum covers or confirmation timing. Never book or negotiate.</label>}
        <button
          disabled={busy || !!deliveryState}
          onClick={async () => {
            setError("");
            setBusy(true);
            try {
              await send({ vendorId, autoFollowup: allowFollowup });
              setNotice(
                "Enquiry queued. Watch the message record for confirmation.",
              );
            } catch (e) {
              setError(describe(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Approve & send this enquiry
        </button>
      </details>
      <form onSubmit={save}>
        <h3>Already have a reply?</h3>
        <p>
          Paste the venue’s email. It is saved privately and sent to OpenAI for
          extraction.
        </p>
        <label>
          Subject
          <input
            name="subject"
            maxLength={200}
            defaultValue={`Quote for ${event.title}`}
          />
        </label>
        <label>
          Original reply
          <textarea
            required
            name="body"
            rows={6}
            maxLength={20000}
            placeholder="Paste the vendor’s own reply, including prices and conditions."
          />
        </label>
        <button disabled={busy}>
          {busy ? "Saving reply…" : "Save reply & extract quote"}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && !(notice.startsWith("Enquiry") && deliveryState) && (
        <p role="status">
          {notice.startsWith("Reply saved") &&
          messages?.[0]?.extractionStatus === "complete"
            ? "Quote extracted. Your comparison is updated."
            : notice.startsWith("Reply saved") &&
                messages?.[0]?.extractionStatus === "failed"
              ? "Reply saved, but extraction failed. Open the original message below to retry."
              : notice}
        </p>
      )}
      <h3>Original messages</h3>
      <p className="note">Clarification answers can complete an earlier quote. Read both source messages before relying on the combined total.</p>
      {messages === undefined ? (
        <p>Loading replies…</p>
      ) : messages.length === 0 ? (
        <p className="note">No messages yet. Nothing has been sent.</p>
      ) : (
        messages.map((m) => (
          <details className="message" key={m._id}>
            <summary>
              {m.subject || "Untitled reply"}
              <span>
                {m.direction === "out"
                  ? "Sent"
                  : m.agentmailMessageId.startsWith("manual:")
                    ? "Pasted reply"
                    : m.agentmailMessageId.startsWith("qa-webhook:")
                      ? "Webhook test"
                      : "Inbox reply"}{" "}
                · {m.extractionStatus ?? "recorded"}
              </span>
            </summary>
            <pre>{m.body}</pre>
            {m.extractionError && (
              <>
                <p className="error">{m.extractionError}</p>
                <button
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await retry({ messageId: m._id });
                    } catch (e) {
                      setError(describe(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Retry extraction
                </button>
              </>
            )}
          </details>
        ))
      )}
    </section>
  );
}
