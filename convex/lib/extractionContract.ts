export const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    reply_kind: { enum: ["quote", "declined", "auto_reply", "no_price"] },
    vendor_name: { type: ["string", "null"] },
    pricing_model: {
      enum: ["per_head", "package", "hall_plus_fnb", "unknown"],
    },
    per_head_veg: { type: ["number", "null"] },
    per_head_nonveg: { type: ["number", "null"] },
    package_total: { type: ["number", "null"] },
    package_covers: { type: ["number", "null"] },
    hall_rent: { type: ["number", "null"] },
    fnb_minimum: { type: ["number", "null"] },
    min_guarantee_covers: { type: ["number", "null"] },
    taxes_included: { type: ["boolean", "null"] },
    tax_percent: { type: ["number", "null"] },
    lead_time_days: { type: ["number", "null"] },
    inclusions: { type: "array", items: { type: "string" } },
    exclusions: { type: "array", items: { type: "string" } },
    unstated: { type: "array", items: { type: "string" } },
  },
  required: [
    "reply_kind",
    "vendor_name",
    "pricing_model",
    "per_head_veg",
    "per_head_nonveg",
    "package_total",
    "package_covers",
    "hall_rent",
    "fnb_minimum",
    "min_guarantee_covers",
    "taxes_included",
    "tax_percent",
    "lead_time_days",
    "inclusions",
    "exclusions",
    "unstated",
  ],
};

export const EXTRACT_SYSTEM = `You extract structured quote data from vendor replies to an event catering or venue enquiry.

Rules that matter more than completeness:
- Use null for anything the vendor did not actually state. Never infer a standard rate, a usual tax percentage, or a typical lead time. An empty field is correct; a plausible guess is a defect.
- List every field you set to null in "unstated".
- Amounts are Indian rupees. "2,10,000" is 210000. "1.5L" or "1.5 lakh" is 150000.
- taxes_included: true only if the vendor said the price includes tax. false only if they said tax is extra. null if they did not mention tax at all.
- tax_percent: only if a number was stated. "plus taxes as applicable" is null, not 18.
- If the vendor quotes several tiers, pick the one that applies to the buyer's stated headcount, not the cheapest.
- pricing_model "unknown" when the reply carries no price at all, for example when it only refers to an attachment.
- If the vendor says they cannot serve the date asked about, set pricing_model "unknown" and leave every price null, even when they quote a rate for other dates. A price for a date the buyer did not ask about is not a quote.
- Only set per_head_nonveg when a non-vegetarian rate was stated separately. A single unlabelled rate goes in per_head_veg alone. Never copy one rate into both fields.
- If a rate is given as a range, record the lower bound and add "price_range" to unstated.
- When an earlier price and a revised price both appear, take the revised one.
- reply_kind classifies the reply itself: "quote" when it carries a usable price for the date asked about, "declined" when they cannot serve that date, "auto_reply" for an out-of-office or other automated response, "no_price" when they replied willingly but named no figure.
- Read only the vendor's own words. Ignore quoted text from earlier messages in the thread, including any budget or figure the buyer named.`;
