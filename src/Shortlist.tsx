import { useState } from "react";
import { useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { enquiryText } from "../convex/lib/brief";
type Venue = {
  vendorId: Id<"vendors">;
  vendorName: string;
  email: string;
  sourceUrl: string | null;
  discoveryExcerpt: string | null;
  shortlisted: boolean;
  deliveryState: string | null;
  deliveryError: string | null;
  status: string;
  followupState: string | null;
  quote: unknown;
  norm: { blocker: string | null } | null;
  gaps: string[];
};
export default function Shortlist({
  event,
  rows,
  onOpen,
}: {
  event: Doc<"events">;
  rows: Venue[];
  onOpen: (id: Id<"vendors">) => void;
}) {
  const choose = useMutation(api.vendors.shortlist),
    send = useMutation(api.vendors.approveBatch);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [follow, setFollow] = useState(false);
  const selected = rows.filter((r) => r.shortlisted && !r.deliveryState);
  const sent = rows.filter((r) => r.deliveryState).length;
  const state = (r: Venue) =>
    r.deliveryError
      ? "Delivery needs review"
      : r.status === "declined"
        ? "Venue declined"
        : r.quote
          ? r.norm?.blocker
            ? "Quote needs review"
            : r.gaps.length
              ? "Terms need confirmation"
              : "Quote extracted"
          : r.status === "replied"
            ? "Processing reply"
            : r.deliveryState === "sent"
              ? "Awaiting venue reply"
              : r.deliveryState
                ? `Enquiry ${r.deliveryState}`
                : "Review contact";
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e instanceof ConvexError && typeof e.data === "string"
          ? e.data
          : "Could not save this change. Check your sending allowance and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (!rows.length) return null;
  return (
    <section className="shortlist" aria-label="Venue shortlist">
      <div className="section-heading">
        <div>
          <h2>Your venue contacts</h2>
          <p>
            Check the source before sending. Availability, capacity and budget
            are not yet confirmed.
          </p>
        </div>
      </div>
      <div className="shortlist-grid">
        {rows.map((r) => (
          <article
            className={`venue-card ${r.shortlisted ? "chosen" : ""}`}
            key={r.vendorId}
          >
            <label className="venue-choice">
              <input
                type="checkbox"
                checked={r.shortlisted}
                disabled={busy || !!r.deliveryState}
                onChange={(e) =>
                  void run(() =>
                    choose({
                      vendorId: r.vendorId,
                      selected: e.target.checked,
                    }),
                  )
                }
              />
              <strong>{r.vendorName}</strong>
            </label>
            <p className="contact-email">{r.email}</p>
            <span className="pill">{state(r)}</span>
            {r.discoveryExcerpt && (
              <details className="source-details">
                <summary>What the source says</summary>
                <p className="source-excerpt">{r.discoveryExcerpt}</p>
              </details>
            )}
            {!r.sourceUrl && <p className="note">Added by you</p>}
            {r.sourceUrl && (
              <a href={r.sourceUrl} target="_blank" rel="noreferrer">
                Check source website ↗
              </a>
            )}
            <button className="row-action" onClick={() => onOpen(r.vendorId)}>
              Open replies or upload a quote →
            </button>
          </article>
        ))}
      </div>
      {selected.length > 0 && (
        <details className="batch-review">
          <summary>
            Review enquiry to {selected.length} selected{" "}
            {selected.length === 1 ? "venue" : "venues"}
          </summary>
          <p>
            <strong>To, separately:</strong>{" "}
            {selected.map((r) => r.email).join(", ")}
          </p>
          <pre>{enquiryText(event)}</pre>
          <label className="followup-choice">
            <input
              type="checkbox"
              checked={follow}
              onChange={(e) => setFollow(e.target.checked)}
            />
            Allow one clarification per venue about missing taxes, minimum
            covers or confirmation timing. No booking or negotiation.
          </label>
          <p className="note">
            Each venue receives a separate email. {Math.max(0, 3 - sent)} of 3
            event slots remain. Verify your email before sending.
          </p>
          <button
            disabled={busy || selected.length > 3 - sent}
            onClick={() =>
              void run(async () => {
                await send({
                  eventId: event._id,
                  vendorIds: selected.map((r) => r.vendorId),
                  autoFollowup: follow,
                });
                setNotice(
                  "Enquiries queued. Delivery progress will update here.",
                );
              })
            }
          >
            Approve & send {selected.length} enquiries
          </button>
          {selected.length > 3 - sent && (
            <p className="error">
              Select no more than {Math.max(0, 3 - sent)} unsent venues.
            </p>
          )}
        </details>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
