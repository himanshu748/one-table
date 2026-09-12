import {
  gapsWorthAsking,
  type ExtractedQuote,
  type Normalised,
} from "../convex/lib/normalise";

export type DecisionQuote = ExtractedQuote & {
  lead_time_days: number | null;
  inclusions?: string[];
  exclusions?: string[];
};

export const termLabel = (term: string) =>
  ({
    taxes_included: "Whether tax is included",
    tax_percent: "Tax rate",
    lead_time_days: "Booking lead time",
    min_guarantee_covers: "Minimum billed guests",
    fnb_minimum: "Minimum food and beverage spend",
    package_total: "Package price",
    package_covers: "Guests covered by the package",
    hall_rent: "Hall rent",
    per_head_veg: "Vegetarian price per guest",
    per_head_nonveg: "Non-vegetarian price per guest",
    price_range: "A fixed price instead of a range",
  })[term] ?? term.replaceAll("_", " ");

// Irrelevant null fields are not missing terms: a fixed package need not state
// a per-plate rate, and an inclusive price need not state a separate tax rate.
export function decisionUnknowns(
  q: DecisionQuote,
  norm: Normalised,
  diet: "veg" | "nonveg",
) {
  const missing = new Set(gapsWorthAsking(q));
  if (q.reply_kind === "declined" || q.reply_kind === "auto_reply") return [];
  if (q.pricing_model === "package") {
    if (q.package_total === null) missing.add("package_total");
    if (q.package_covers === null) missing.add("package_covers");
  }
  if (q.pricing_model === "per_head" || q.pricing_model === "hall_plus_fnb") {
    if ((diet === "veg" ? q.per_head_veg : q.per_head_nonveg) === null)
      missing.add(diet === "veg" ? "per_head_veg" : "per_head_nonveg");
  }
  if (q.pricing_model === "hall_plus_fnb") {
    if (q.hall_rent === null) missing.add("hall_rent");
    if (q.fnb_minimum === null) missing.add("fnb_minimum");
  }
  const schemaFields = new Set([
    "package_total",
    "package_covers",
    "hall_rent",
    "fnb_minimum",
    "taxes_included",
    "tax_percent",
    "lead_time_days",
    "min_guarantee_covers",
    "per_head_veg",
    "per_head_nonveg",
  ]);
  for (const term of q.unstated ?? [])
    if (!schemaFields.has(term)) missing.add(term);
  const labels = [...missing].map(termLabel);
  if (!labels.length && norm.blocker) labels.push(norm.blocker);
  return [...new Set(labels)];
}

export function quoteTermChanges(
  current: DecisionQuote,
  previous?: DecisionQuote,
) {
  return (["inclusions", "exclusions", "unstated"] as const).filter((key) => {
    const before = [...(previous?.[key] ?? [])].sort();
    const after = [...(current[key] ?? [])].sort();
    return JSON.stringify(before) !== JSON.stringify(after);
  });
}

export function toCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          const guarded = /^[\s]*[=+@-]/.test(value) ? `'${value}` : value;
          return `"${guarded.replaceAll('"', '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}

export function taxBasis(norm: Normalised | null) {
  return norm
    ? norm.isPreTax
      ? "Before tax; final tax unconfirmed"
      : "Tax treatment reflected in stated total"
    : "No quote";
}
