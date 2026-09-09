import type { Infer } from "convex/values";
import type { extractedQuote } from "../validators";
type Quote = Infer<typeof extractedQuote>;
// Only an answer to our clarification can carry forward an earlier price.
// A new/revised price, decline, or autoresponder is never merged this way.
export function mergeTerms(
  previous: Quote,
  reply: Quote,
  asked: string[],
): Quote | null {
  if (
    previous.reply_kind !== "quote" ||
    reply.reply_kind !== "no_price" ||
    reply.pricing_model !== "unknown" ||
    [
      reply.per_head_veg,
      reply.per_head_nonveg,
      reply.package_total,
      reply.package_covers,
      reply.hall_rent,
      reply.fnb_minimum,
    ].some((v) => v !== null)
  )
    return null;
  const fields = [
    "taxes_included",
    "tax_percent",
    "min_guarantee_covers",
    "lead_time_days",
  ] as const;
  const permitted = fields.filter(
    (k) =>
      asked.includes(k) ||
      (k === "tax_percent" && asked.includes("taxes_included")),
  );
  const updates = permitted.filter((k) => reply[k] !== null);
  if (!updates.length) return null;
  // Pick only extraction fields, never database metadata from the prior record.
  const result: Quote = {
    ...reply,
    reply_kind: "quote",
    vendor_name: previous.vendor_name,
    pricing_model: previous.pricing_model,
    per_head_veg: previous.per_head_veg,
    per_head_nonveg: previous.per_head_nonveg,
    package_total: previous.package_total,
    package_covers: previous.package_covers,
    hall_rent: previous.hall_rent,
    fnb_minimum: previous.fnb_minimum,
    min_guarantee_covers: previous.min_guarantee_covers,
    taxes_included: previous.taxes_included,
    tax_percent: previous.tax_percent,
    lead_time_days: previous.lead_time_days,
    inclusions: previous.inclusions,
    exclusions: previous.exclusions,
    unstated: previous.unstated.filter(
      (k) => !updates.includes(k as (typeof updates)[number]),
    ),
  };
  for (const k of updates) Object.assign(result, { [k]: reply[k] });
  return result;
}
