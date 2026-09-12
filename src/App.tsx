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
import { enquiryText, type Brief } from "../convex/lib/brief";
import EventBrief from "./EventBrief";
import QuoteHistory from "./QuoteHistory";
import Shortlist from "./Shortlist";
import { QuoteUpload, OriginalAttachments } from "./QuoteUpload";
import Board from "./Board";
import Landing from "./Landing";
import SignIn from "./SignIn";
import demoReplies from "./demoReplies.json";
import { demoRows, demoEvent } from "./demoData";
import "./index.css";
import "./workspace.css";
const describe = (e: unknown) => {
  if (e instanceof ConvexError) {
    if (typeof e.data === "string") return e.data;
    if (
      e.data &&
      typeof e.data === "object" &&
      "kind" in e.data &&
      e.data.kind === "RateLimited"
    )
      return "This trial allowance has been used. Please try again after the daily limit resets.";
  }
  return "That could not be saved. Check your connection and try again.";
};
function Demo() {
  const [selected, setSelected] = useState<string | null>(null);
  const reply = demoReplies.find((r) => r.id === selected);
  useEffect(() => {
    if (reply)
      document.getElementById("mock-reply")?.scrollIntoView({ block: "start" });
  }, [reply]);
  return (
    <>
      <div className="banner">
        <strong>Example comparison</strong>
        <span>
          Mock data only. Explore fictional venue quotes. No emails are sent and
          nothing is saved to your workspace.
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
      {reply && (
        <section
          id="mock-reply"
          className="demo-reply"
          aria-label="Mock original reply"
        >
          <div className="section-heading">
            <h2>{reply.subject}</h2>
            <button className="quiet" onClick={() => setSelected(null)}>
              Close mock reply
            </button>
          </div>
          <p className="note">
            Fictional example · This message was never sent to a venue.
          </p>
          <pre>{reply.body}</pre>
        </section>
      )}
    </>
  );
}
export default function App() {
  const readMode = () =>
    location.hash === "#demo"
      ? "demo"
      : location.hash === "#workspace"
        ? "live"
        : "home";
  const [mode, updateMode] = useState(readMode);
  const setMode = (value: string) => {
    location.hash =
      value === "live" ? "workspace" : value === "demo" ? "demo" : "";
  };
  useEffect(() => {
    const sync = () => {
      updateMode(readMode());
      if (["#demo", "#workspace", ""].includes(location.hash))
        window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const configured = !!import.meta.env.VITE_CONVEX_URL;
  return (
    <main
      className={`wrap ${mode === "home" ? "landing-shell" : ""}`}
      id="main"
    >
      <header className="masthead">
        <a className="wordmark" href="/">
          One Table<span>VENUE QUOTES, COMPARED.</span>
        </a>
        <nav aria-label="Workspace">
          <a href="#demo" className={mode === "demo" ? "active" : "quiet"}>
            See how it works
          </a>
          <a href="#workspace" className={mode === "live" ? "active" : "quiet"}>
            My events
          </a>
        </nav>
      </header>
      {mode === "home" ? (
        <Landing />
      ) : mode === "demo" ? (
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
        <span>
          Early pilot · Review original replies before booking.{" "}
          <a href="#workspace">My events</a>
        </span>
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
  const connection = useConvexConnectionState();
  const [id, setId] = useState<Id<"events"> | null>(null);
  const [creating, setCreating] = useState(false);
  return (
    <>
      {account && !account.verified && <SignIn upgrading />}
      {account?.verified && (
        <div className="section-heading account-bar">
          <span>{account.email} · Email verified</span>
          <button className="quiet" onClick={() => void signOut()}>
            Sign out
          </button>
        </div>
      )}
      {!connection.isWebSocketConnected && (
        <p className="connection-notice" role="status">
          Reconnecting. Your saved events will appear when you’re back online.
        </p>
      )}
      {id ? (
        <>
          <button className="quiet back" onClick={() => setId(null)}>
            ← All events
          </button>
          <LiveEvent key={id} id={id} />
        </>
      ) : creating ? (
        <EventBrief
          discovery={config?.discovery ?? false}
          onCancel={() => setCreating(false)}
          onCreated={(id) => {
            setId(id);
            setCreating(false);
          }}
        />
      ) : (
        <section className="events-home">
          <div className="events-heading">
            <div>
              <h1>Your gatherings.</h1>
              <p>Good company. A venue that adds up.</p>
            </div>
            <button onClick={() => setCreating(true)}>Plan a gathering</button>
          </div>
          {events === undefined ? (
            <p role="status">Loading your events…</p>
          ) : events.length ? (
            <div className="event-list" aria-label="Saved events">
              {events.map((e) => (
                <button key={e.id} onClick={() => setId(e.id)}>
                  <span className="event-monogram" aria-hidden="true">
                    {e.title.charAt(0)}
                  </span>
                  <span className="event-name">
                    <strong>{e.title}</strong>
                    <span>{e.city}</span>
                  </span>
                  <span className="event-open">Open event →</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="welcome-empty">
              <h2>The next occasion starts here.</h2>
              <p>
                Tell us where, when and how many people. Compare venue replies
                together, with the original terms always close by.
              </p>
              <button onClick={() => setCreating(true)}>
                Create your first event
              </button>
            </div>
          )}
          <p className="workspace-footnote">
            Your events are private. You approve enquiries before they’re sent.
          </p>
        </section>
      )}
    </>
  );
}
function LiveEvent({ id }: { id: Id<"events"> }) {
  const board = useQuery(api.board.forEvent, { eventId: id });
  const discover = useMutation(api.events.discover);
  const add = useMutation(api.vendors.add);
  const [selected, setSelected] = useState<Id<"vendors"> | null>(null);
  const [view, setView] = useState<"shortlist" | "compare" | "replies">(
    "shortlist",
  );
  const openReplies = (id: Id<"vendors">) => {
    setSelected(id);
    setView("replies");
  };
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
      openReplies(vendor);
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }
  if (!board) return <p role="status">Loading the comparison…</p>;
  return (
    <>
      <h1 className="event-title">{board.event.title}</h1>
      <p className="sub">
        {board.event.city} · {board.event.eventDate} · {board.rows.length}{" "}
        venues
      </p>
      <div className="brief-summary">
        <span>
          {board.event.headcount} guests ·{" "}
          {board.event.dietary === "both"
            ? "Both menus"
            : board.event.dietary === "nonveg"
              ? "Non-vegetarian"
              : "Vegetarian"}
        </span>
        {board.event.neighbourhood && <span>{board.event.neighbourhood}</span>}
        {board.event.dateFlexible && <span>Flexible dates</span>}
        {board.event.budgetHint && (
          <span>Budget ₹{board.event.budgetHint.toLocaleString("en-IN")}</span>
        )}
        {board.event.needs.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
      <nav className="event-navigation" aria-label="Event views">
        {(["shortlist", "compare", "replies"] as const).map((v) => (
          <button
            className={view === v ? "selected" : ""}
            aria-pressed={view === v}
            key={v}
            onClick={() => setView(v)}
          >
            {v === "shortlist"
              ? "Shortlist"
              : v === "compare"
                ? "Compare quotes"
                : "Replies & documents"}
            <span>
              {v === "shortlist"
                ? board.rows.length
                : v === "compare"
                  ? board.rows.filter((r) => r.quote).length
                  : ""}
            </span>
          </button>
        ))}
      </nav>
      {view === "shortlist" && (
        <>
          <section className="venue-tools">
            <div>
              <h2>Find a place that fits.</h2>
              <p>Find contacts for your brief, then choose who to approach.</p>
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
                  : "Find venue contacts"}
              </button>
              {board.event.discoveryError && (
                <p className="error" role="alert">
                  {board.event.discoveryError}
                </p>
              )}
            </div>
            <details className="manual-venue">
              <summary>Add a venue you know</summary>
              <form onSubmit={addVenue}>
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
            </details>
          </section>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Shortlist
            event={board.event}
            rows={board.rows}
            onOpen={openReplies}
          />
        </>
      )}
      {view === "compare" && (
        <Board
          initialDiet={board.diet}
          budget={board.event.budgetHint}
          initialHeadcount={board.headcount}
          onSelect={(s) => openReplies(s as Id<"vendors">)}
          rows={board.rows.map((r) => ({
            id: r.vendorId,
            name: r.vendorName,
            quote: r.quote,
            sourceUrl: r.sourceUrl,
            status: r.status,
            pricingFlag: r.pricingFlag,
            quoteReceivedAt: r.quoteReceivedAt,
            newerReply: r.newerReply,
          }))}
        />
      )}
      {view === "replies" && (
        <>
          <div className="reply-selector">
            <label>
              Venue
              <select
                value={selected ?? ""}
                onChange={(e) => setSelected(e.target.value as Id<"vendors">)}
              >
                <option value="">Choose a venue</option>
                {board.rows.map((r) => (
                  <option key={r.vendorId} value={r.vendorId}>
                    {r.vendorName}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!selected && (
            <div className="empty">
              <h2>Keep every conversation together.</h2>
              <p>
                Choose a venue to read replies, upload a document or review an
                enquiry.
              </p>
            </div>
          )}
        </>
      )}
      {view === "replies" && selected && (
        <ReplyDesk
          key={selected}
          vendorId={selected}
          event={board.event}
          name={
            board.rows.find((r) => r.vendorId === selected)?.vendorName ??
            "Venue"
          }
          email={board.rows.find((r) => r.vendorId === selected)?.email ?? ""}
          autoFollowup={
            board.rows.find((r) => r.vendorId === selected)?.autoFollowup ??
            false
          }
          followupState={
            board.rows.find((r) => r.vendorId === selected)?.followupState ??
            null
          }
          followupError={
            board.rows.find((r) => r.vendorId === selected)?.followupError ??
            null
          }
          deliveryState={
            board.rows.find((r) => r.vendorId === selected)?.deliveryState ??
            null
          }
          deliveryError={
            board.rows.find((r) => r.vendorId === selected)?.deliveryError ??
            null
          }
          close={() => {
            setSelected(null);
            setView("shortlist");
          }}
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
  event: Brief;
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
  const [entry, setEntry] = useState<"none" | "upload" | "paste">("none");
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
      {deliveryState && (
        <p role="status">
          Enquiry: {deliveryState}. {deliveryError}
        </p>
      )}
      {followupState && (
        <p role="status">
          Clarification: {followupState}. {followupError}
        </p>
      )}
      {deliveryState && (
        <label className="followup-choice">
          <input
            type="checkbox"
            checked={autoFollowup}
            disabled={
              busy ||
              ["sent", "uncertain", "sending"].includes(followupState ?? "")
            }
            onChange={async (e) => {
              setBusy(true);
              try {
                await setAuto({ vendorId, enabled: e.target.checked });
              } catch (e) {
                setError(describe(e));
              } finally {
                setBusy(false);
              }
            }}
          />
          Allow one automatic clarification after the next quote. No bookings or
          negotiations.
        </label>
      )}
      <details className="enquiry">
        <summary>Review enquiry before sending</summary>
        <p>
          <strong>To:</strong> {email}
        </p>
        <pre>{enquiryText(event)}</pre>
        <p className="note">
          Verify your email to send. Public trial: 3 venues per event, 5
          enquiries per day. Replies arrive here when venues respond.
        </p>
        {!deliveryState && (
          <label className="followup-choice">
            <input
              type="checkbox"
              checked={allowFollowup}
              onChange={(e) => setAllowFollowup(e.target.checked)}
            />
            If terms are missing, send one clarification in this thread about
            taxes, minimum covers or confirmation timing. Never book or
            negotiate.
          </label>
        )}
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
      <div className="reply-actions">
        <button
          className="secondary"
          aria-pressed={entry === "upload"}
          onClick={() => setEntry(entry === "upload" ? "none" : "upload")}
        >
          Upload a quote
        </button>
        <button
          className="quiet"
          aria-pressed={entry === "paste"}
          onClick={() => setEntry(entry === "paste" ? "none" : "paste")}
        >
          Paste an email
        </button>
      </div>
      {entry === "upload" && <QuoteUpload vendorId={vendorId} />}
      {entry === "paste" && (
        <form onSubmit={save}>
          <h3>Already have a reply?</h3>
          <p>
            Paste the venue’s email. It is saved privately and sent to OpenAI
            for extraction.
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
      )}
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
      <QuoteHistory vendorId={vendorId} />
      <h3>Original messages</h3>
      <p className="note">
        Clarification answers can complete an earlier quote. Read both source
        messages before relying on the combined total.
      </p>
      {messages === undefined ? (
        <p>Loading replies…</p>
      ) : messages.length === 0 ? (
        <p className="note">No messages yet. Nothing has been sent.</p>
      ) : (
        messages.map((m) => (
          <details className="message" id={`message-${m._id}`} key={m._id}>
            <summary>
              {m.subject || "Untitled reply"}
              <span>
                {m.direction === "out"
                  ? "Sent"
                  : m.agentmailMessageId.startsWith("manual:")
                    ? "Pasted reply"
                    : m.agentmailMessageId.startsWith("upload:")
                      ? "Uploaded document"
                      : m.agentmailMessageId.startsWith("qa-webhook:")
                        ? "Webhook test"
                        : "Inbox reply"}{" "}
                · {m.extractionStatus ?? "recorded"}
              </span>
            </summary>
            <pre>
              {m.attachmentIds.length
                ? "Original quote supplied as an attachment."
                : m.body}
            </pre>
            {m.attachmentIds.length > 0 && (
              <OriginalAttachments messageId={m._id} />
            )}
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
