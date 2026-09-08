import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  normalise,
  gapsWorthAsking,
  quoteTier,
  type ExtractedQuote,
} from "../convex/lib/normalise";
export type BoardRow = {
  id: string;
  name: string;
  quote: (ExtractedQuote & { lead_time_days: number | null }) | null;
  sourceUrl?: string | null;
  status?: string;
  pricingFlag?: string | null;
};
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const labels: Record<string, string> = {
  taxes_included: "Tax inclusion",
  tax_percent: "Tax rate",
  lead_time_days: "Booking lead time",
  min_guarantee_covers: "Minimum covers",
};
export default function Board({
  rows,
  initialHeadcount,
  onSelect,
  selectLabel = "Open replies & enquiry →",
}: {
  rows: BoardRow[];
  initialHeadcount: number;
  onSelect?: (id: string) => void;
  selectLabel?: string;
}) {
  const [headcount, setHeadcount] = useState(initialHeadcount);
  const [diet, setDiet] = useState<"veg" | "nonveg">("veg");
  const body = useRef<HTMLTableSectionElement>(null);
  const previous = useRef(new Map<string, number>());
  const scored = useMemo(
    () =>
      rows
        .map((row) => ({
          row,
          norm: row.quote ? normalise(row.quote, headcount, diet) : null,
          gaps: row.quote ? gapsWorthAsking(row.quote) : [],
        }))
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
      ["Venue", "Guests", "Menu", "Total INR", "Uncertainty"],
      ...scored.map(({ row, norm }) => [
        row.name,
        String(headcount),
        diet,
        String(norm?.total ?? ""),
        norm?.blocker ?? (norm ? "" : "Awaiting quote"),
      ]),
    ];
    const csv = values
      .map((r) =>
        r
          .map(
            (c) =>
              '"' +
              (/^[=+@-]/.test(c) ? "'" + c : c).replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
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
          max={Math.max(300, initialHeadcount)}
          step="1"
          value={headcount}
          onChange={(e) => setHeadcount(Number(e.target.value))}
        />
        <output htmlFor="hc" className="count">
          {headcount}
          <span>guests</span>
        </output>
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
      <div className="comparison-summary">
        <p className="hint" aria-live="polite">
          {comparable.length} confirmed{" "}
          {comparable.length === 1 ? "total" : "totals"}
          {spread !== null
            ? ` · ${inr(spread)} between lowest and highest`
            : ""}
          . Uncertain prices are listed separately.
        </p>
        <button className="quiet" onClick={download} disabled={!rows.length}>
          Export comparison
        </button>
      </div>
      <table className="comparison">
        <caption className="sr-only">
          Venue quotes for {headcount} {diet} guests. Confirmed totals first,
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
              </td>
              <td className="num">
                {norm?.total != null ? (
                  <>
                    <strong className="total">
                      {inr(norm.total)}
                      {norm.isPreTax && <span className="pretax"> + tax</span>}
                    </strong>
                    <span className="perhead">
                      {inr(Math.round(norm.total / headcount))} / guest
                    </span>
                  </>
                ) : (
                  <span className="closed">
                    {norm?.blocker ?? "No reply yet"}
                  </span>
                )}
                {norm?.total != null && norm.blocker && (
                  <p className="note bite">{norm.blocker}</p>
                )}
              </td>
              <td>
                {norm && !norm.blocker && gaps.length === 0 ? (
                  <span className="pill complete">Ready to compare</span>
                ) : (
                  <>
                    {gaps.map((g) => (
                      <span className="pill asking" key={g}>
                        {labels[g] ?? g}
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
