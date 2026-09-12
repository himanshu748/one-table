import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { normalise, quoteTier } from "../convex/lib/normalise";
import {
  decisionUnknowns,
  toCsv,
  taxBasis,
  type DecisionQuote,
} from "./quoteDetails";
export type BoardRow = {
  id: string;
  name: string;
  quote: DecisionQuote | null;
  sourceUrl?: string | null;
  status?: string;
  pricingFlag?: string | null;
  quoteReceivedAt?: number | null;
  newerReply?: "queued" | "failed" | null;
};
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export default function Board({
  rows,
  initialHeadcount,
  initialDiet = "veg",
  budget,
  onSelect,
  selectLabel = "Open replies & enquiry →",
}: {
  rows: BoardRow[];
  initialHeadcount: number;
  initialDiet?: "veg" | "nonveg";
  budget?: number | null;
  onSelect?: (id: string) => void;
  selectLabel?: string;
}) {
  const [headcount, setHeadcount] = useState(initialHeadcount);
  const [diet, setDiet] = useState<"veg" | "nonveg">(initialDiet);
  const body = useRef<HTMLTableSectionElement>(null);
  const previous = useRef(new Map<string, number>());
  const scored = useMemo(
    () =>
      rows
        .map((row) => {
          const norm = row.quote ? normalise(row.quote, headcount, diet) : null;
          return {
            row,
            norm,
            gaps:
              row.quote && norm ? decisionUnknowns(row.quote, norm, diet) : [],
          };
        })
        .sort(
          (a, b) =>
            quoteTier(a.norm) - quoteTier(b.norm) ||
            (a.norm?.total ?? Infinity) - (b.norm?.total ?? Infinity),
        ),
    [rows, headcount, diet],
  );
  useLayoutEffect(() => {
    const els = Array.from(body.current?.children ?? []) as HTMLElement[];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = new Map<string, number>();
    for (const el of els) {
      el.getAnimations().forEach((a) => a.cancel());
      next.set(el.dataset.id!, el.getBoundingClientRect().top);
    }
    if (!reduced)
      for (const el of els) {
        const old = previous.current.get(el.dataset.id!);
        const top = next.get(el.dataset.id!)!;
        if (old !== undefined && Math.abs(old - top) > 1)
          el.animate(
            [
              { transform: `translateY(${old - top}px)` },
              { transform: "translateY(0)" },
            ],
            { duration: 300, easing: "cubic-bezier(.22,.61,.36,1)" },
          );
      }
    previous.current = next;
  }, [scored]);
  const comparable = scored.filter(
    (s) => s.norm?.total != null && !s.norm.blocker,
  );
  const spread =
    comparable.length > 1
      ? comparable.at(-1)!.norm!.total! - comparable[0].norm!.total!
      : null;
  function download() {
    const values = [
      [
        "Venue",
        "Guests",
        "Menu",
        "Stated total INR",
        "Price status",
        "Tax basis",
        "Included",
        "Extra or excluded",
        "Still to confirm",
        "Source website",
        "Quote received",
        "Newer reply",
      ],
      ...scored.map(({ row, norm, gaps }) => [
        row.name,
        String(headcount),
        diet,
        String(norm?.total ?? ""),
        norm?.blocker ??
          (norm ? "Stated total; review extras" : "Awaiting quote"),
        taxBasis(norm),
        row.quote?.inclusions?.join("; ") || "Not itemised",
        row.quote?.exclusions?.join("; ") ||
          "No exclusions itemised; confirm with venue",
        gaps.join("; "),
        row.sourceUrl ?? "",
        row.quoteReceivedAt ? new Date(row.quoteReceivedAt).toISOString() : "",
        row.newerReply ?? "",
      ]),
    ];
    const csv = toCsv(values);
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "one-table-comparison.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <section aria-label="Quote comparison">
      <div className="control">
        <label htmlFor="hc">Guest count</label>
        <input
          id="hc"
          type="range"
          min="1"
          max="2000"
          step="1"
          value={headcount}
          onChange={(e) => setHeadcount(Number(e.target.value))}
        />
        <label className="guest-entry">
          <span className="sr-only">Exact guest count</span>
          <input
            type="number"
            min={1}
            max={2000}
            value={headcount}
            onChange={(e) => {
              const next = Number(e.target.value);
              if (Number.isInteger(next) && next >= 1 && next <= 2000)
                setHeadcount(next);
            }}
          />
          <span>guests</span>
        </label>
        <label className="menu-choice">
          Menu
          <select
            value={diet}
            onChange={(e) => setDiet(e.target.value as typeof diet)}
          >
            <option value="veg">Vegetarian</option>
            <option value="nonveg">Non-vegetarian</option>
          </select>
        </label>
      </div>
      {rows.length > 0 && (
        <div className="decision-overview">
          <div>
            <h2>
              {comparable.length
                ? "Compare the price. Check the terms."
                : "A price is only part of the answer."}
            </h2>
            <p>
              <strong>{comparable.length}</strong> comparable stated{" "}
              {comparable.length === 1 ? "total" : "totals"}
              {" · "}
              {
                scored.filter(
                  (s) => s.row.quote?.reply_kind === "quote" && s.norm?.blocker,
                ).length
              }{" "}
              need price confirmation
              {" · "}
              {
                scored.filter(
                  (s) =>
                    !s.row.quote ||
                    s.row.quote.reply_kind === "auto_reply" ||
                    s.row.quote.reply_kind === "no_price",
                ).length
              }{" "}
              awaiting a quote
            </p>
          </div>
          <span>
            At {headcount} {diet === "veg" ? "vegetarian" : "non-vegetarian"}{" "}
            guests
          </span>
        </div>
      )}
      <div className="comparison-summary">
        <p className="hint" aria-live="polite">
          {spread !== null
            ? `${inr(spread)} between the lowest and highest comparable stated totals. `
            : ""}
          Included items differ. Excluded or unstated costs can change the final
          bill and the order.
        </p>
        <button className="quiet" onClick={download} disabled={!rows.length}>
          Export comparison
        </button>
      </div>
      {budget && (
        <p className="note">
          Budget checks use the stated prices only. Exclusions and unstated
          charges may add to the final bill.
        </p>
      )}
      <table className="comparison">
        <caption className="sr-only">
          Venue quotes for {headcount} {diet} guests. Complete pricing first,
          then incomplete quotes.
        </caption>
        <thead>
          <tr>
            <th scope="col">Venue & quoted basis</th>
            <th scope="col">At {headcount} guests</th>
            <th scope="col">Still to confirm</th>
          </tr>
        </thead>
        <tbody ref={body}>
          {scored.map(({ row, norm, gaps }, i) => (
            <tr
              key={row.id}
              data-id={row.id}
              className={norm?.blocker || !norm ? "incomplete" : ""}
            >
              <td>
                <div className="vendor-line">
                  <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                  {onSelect ? (
                    <button
                      className="vendor-link"
                      onClick={() => onSelect(row.id)}
                    >
                      {row.name}
                    </button>
                  ) : (
                    <strong>{row.name}</strong>
                  )}
                </div>
                <p className="shape">
                  {row.quote?.pricing_model === "per_head"
                    ? `${row.quote.per_head_veg === null ? "Veg not stated" : inr(row.quote.per_head_veg) + " / veg plate"}${row.quote.per_head_nonveg === null ? "" : " · " + inr(row.quote.per_head_nonveg) + " / non-veg plate"}`
                    : row.quote?.pricing_model === "package"
                      ? `${row.quote.package_total == null ? "Amount unstated" : inr(row.quote.package_total)} package · ${row.quote.package_covers ?? "Unstated"} covers`
                      : row.quote?.pricing_model === "hall_plus_fnb"
                        ? `${row.quote.hall_rent == null ? "Rent unstated" : inr(row.quote.hall_rent)} hall + food & beverages`
                        : "Awaiting a usable quote"}
                </p>
                {norm?.notes.map((n) => (
                  <p className="note bite" key={n}>
                    {n}
                  </p>
                ))}
                {row.sourceUrl && (
                  <a
                    className="source"
                    href={row.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Review source website ↗
                  </a>
                )}
                {row.pricingFlag && (
                  <p className="note bite">{row.pricingFlag}</p>
                )}
                {row.quoteReceivedAt && (
                  <p className="quote-date">
                    Quote received{" "}
                    {new Date(row.quoteReceivedAt).toLocaleDateString(
                      undefined,
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </p>
                )}
                {row.newerReply && (
                  <p className="reply-warning" role="status">
                    {row.newerReply === "queued"
                      ? "A newer reply is being read. This price may change."
                      : "A newer reply could not be read. Open replies to retry before deciding."}
                  </p>
                )}
                {row.quote && row.quote.reply_kind === "quote" && (
                  <details className="quote-terms">
                    <summary>What this quote includes</summary>
                    {row.quote.inclusions?.length ? (
                      <ul>
                        {row.quote.inclusions.map((term, index) => (
                          <li key={`${term}-${index}`}>{term}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>
                        Included items were not itemised. Check the original
                        with the venue.
                      </p>
                    )}
                    <p className="note">
                      Terms are extracted from the original quote; review its
                      wording before booking.
                    </p>
                  </details>
                )}
              </td>
              <td className="num">
                {norm?.total != null ? (
                  <>
                    <strong className="total">
                      {inr(norm.total)}
                      {norm.isPreTax && <span className="pretax"> + tax</span>}
                    </strong>
                    <span className="perhead">
                      {norm.blocker ? "Incomplete estimate" : "Stated total"} ·{" "}
                      {inr(Math.round(norm.total / headcount))} / guest
                    </span>
                  </>
                ) : (
                  <span className="closed">
                    {norm?.blocker ?? "No reply yet"}
                  </span>
                )}
                {budget && norm?.total != null && (
                  <p className="budget-note">
                    {norm.total > budget
                      ? `${inr(norm.total - budget)} over budget${norm.blocker ? " before missing costs" : ""}`
                      : norm.blocker
                        ? "Budget fit unconfirmed"
                        : `${inr(budget - norm.total)} within budget`}
                  </p>
                )}
                {norm?.total != null && norm.blocker && (
                  <p className="note bite">{norm.blocker}</p>
                )}
              </td>
              <td>
                {!!row.quote?.exclusions?.length && (
                  <div className="quote-exclusions">
                    <strong>Extra or excluded</strong>
                    <ul>
                      {row.quote.exclusions.map((term, index) => (
                        <li key={`${term}-${index}`}>{term}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {norm && !norm.blocker && gaps.length === 0 ? (
                  <p className="terms-confirmed">
                    Pricing terms stated. Confirm availability and any extras.
                  </p>
                ) : (
                  <>
                    {gaps.map((g) => (
                      <span className="pill asking" key={g}>
                        {g}
                      </span>
                    ))}
                    {gaps.length === 0 && (
                      <span className="note">
                        {norm?.blocker ??
                          "Review the contact, then request a quote."}
                      </span>
                    )}
                  </>
                )}
                {onSelect && (
                  <button
                    className="row-action"
                    onClick={() => onSelect(row.id)}
                  >
                    {selectLabel}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <div className="empty">
          <h3>Your table is ready for its first venue.</h3>
          <p>
            Find source-backed contacts or add a venue you already know. Paste a
            reply to extract its prices.
          </p>
        </div>
      )}
    </section>
  );
}
