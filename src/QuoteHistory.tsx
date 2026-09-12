import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { quoteTermChanges, termLabel } from "./quoteDetails";
const terms = {
  pricing_model: "Pricing basis",
  reply_kind: "Reply type",
  per_head_veg: "Veg / guest",
  per_head_nonveg: "Non-veg / guest",
  package_total: "Package",
  package_covers: "Package covers",
  hall_rent: "Hall rent",
  fnb_minimum: "Food minimum",
  min_guarantee_covers: "Minimum guests",
  taxes_included: "Tax included",
  tax_percent: "Tax %",
  lead_time_days: "Confirmation days",
} as const;
export default function QuoteHistory({
  vendorId,
}: {
  vendorId: Id<"vendors">;
}) {
  const history = useQuery(api.messages.quoteHistory, { vendorId });
  if (!history || history.length < 2) return null;
  const value = (v: unknown) =>
    v === null
      ? "Not stated"
      : typeof v === "boolean"
        ? v
          ? "Yes"
          : "No"
        : String(v).replaceAll("_", " ");
  return (
    <details className="message">
      <summary>Quote history · {history.length} saved versions</summary>
      <p className="note">
        Earlier terms remain here when a new quote or clarification changes the
        comparison. Review the source messages below.
      </p>
      {history.map((q, i) => {
        const previous = history[i + 1];
        const changed = (Object.keys(terms) as (keyof typeof terms)[]).filter(
          (k) => !previous || q[k] !== previous[k],
        );
        const changedText = quoteTermChanges(q, previous);
        return (
          <article key={q._id}>
            <h3>
              {q.supersededAt === null ? "Current quote" : "Earlier quote"} ·{" "}
              {new Date(q._creationTime).toLocaleString()}
            </h3>
            {changed.length || changedText.length ? (
              <ul>
                {changed.map((k) => (
                  <li key={k}>
                    {terms[k]}: {previous && <>{value(previous[k])} → </>}
                    {value(q[k])}
                  </li>
                ))}
                {changedText.map((key) => (
                  <li key={key}>
                    {key === "inclusions"
                      ? "Included"
                      : key === "exclusions"
                        ? "Extra or excluded"
                        : "Not stated"}
                    :
                    {previous && (
                      <>
                        {" "}
                        {previous[key].map(termLabel).join("; ") ||
                          "Nothing itemised"}{" "}
                        →
                      </>
                    )}{" "}
                    {q[key].map(termLabel).join("; ") || "Nothing itemised"}
                  </li>
                ))}
              </ul>
            ) : (
              <p>
                Extracted pricing and terms unchanged. Review the original
                wording below.
              </p>
            )}
            <div className="quote-sources">
              {(q.sourceMessageIds ?? [q.messageId]).map((messageId, index) => (
                <button
                  className="quiet"
                  key={messageId}
                  onClick={() => {
                    const message = document.getElementById(
                      `message-${messageId}`,
                    ) as HTMLDetailsElement | null;
                    if (!message) return;
                    message.open = true;
                    message.querySelector("summary")?.focus();
                    message.scrollIntoView({
                      block: "center",
                      behavior: "instant",
                    });
                  }}
                >
                  Read source {index + 1}
                </button>
              ))}
            </div>
          </article>
        );
      })}
    </details>
  );
}
