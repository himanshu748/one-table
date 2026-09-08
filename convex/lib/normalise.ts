// The model extracts fields. This computes money. Keeping the arithmetic out of
// the model is what makes a total defensible: every rupee here traces to a
// stated field, and a missing field produces a blocker rather than a guess.
//
// Validated against experiments/extraction on 2026-09-08, 6/6 totals correct.

export type PricingModel = "per_head" | "package" | "hall_plus_fnb" | "unknown";

export type ReplyKind = "quote" | "declined" | "auto_reply" | "no_price";

export type ExtractedQuote = {
  reply_kind: ReplyKind;
  pricing_model: PricingModel;
  per_head_veg: number | null;
  per_head_nonveg: number | null;
  package_total: number | null;
  package_covers: number | null;
  hall_rent: number | null;
  fnb_minimum: number | null;
  min_guarantee_covers: number | null;
  taxes_included: boolean | null;
  tax_percent: number | null;
  unstated?: string[];
};

export type Normalised = {
  total: number | null;
  isPreTax: boolean;
  blocker: string | null;
  notes: string[];
};

export type Diet = "veg" | "nonveg" | "both";

function rateFor(q: ExtractedQuote, diet: Diet): number | null {
  if (diet === "both") return null;
  return diet === "nonveg" ? q.per_head_nonveg : q.per_head_veg;
}

export function normalise(
  q: ExtractedQuote,
  headcount: number,
  diet: Diet = "veg",
): Normalised {
  const notes: string[] = [];
  let base: number | null = null;
  if (!Number.isInteger(headcount) || headcount < 1 || headcount > 2000)
    return {
      total: null,
      isPreTax: false,
      blocker: "invalid guest count",
      notes,
    };
  for (const value of [
    q.per_head_veg,
    q.per_head_nonveg,
    q.package_total,
    q.package_covers,
    q.hall_rent,
    q.fnb_minimum,
    q.min_guarantee_covers,
    q.tax_percent,
  ]) {
    if (value !== null && (!Number.isFinite(value) || value < 0))
      return {
        total: null,
        isPreTax: false,
        blocker: "invalid quoted amount",
        notes,
      };
  }
  if (q.tax_percent !== null && q.tax_percent > 100)
    return { total: null, isPreTax: false, blocker: "invalid tax rate", notes };
  if (q.unstated?.includes("price_range"))
    return {
      total: null,
      isPreTax: false,
      blocker: "price is a range; confirm a fixed quote",
      notes,
    };

  // A venue that cannot take the date is not a slow quote, it is a closed door,
  // and the buyer needs to stop waiting on it. Same for a mailbox that answered
  // by robot: nobody has actually read the enquiry yet.
  if (q.reply_kind === "declined") {
    return {
      total: null,
      isPreTax: false,
      blocker: "cannot serve your date",
      notes,
    };
  }
  if (q.reply_kind === "auto_reply") {
    return {
      total: null,
      isPreTax: false,
      blocker: "auto-reply, nobody has read it",
      notes,
    };
  }

  if (q.pricing_model === "per_head") {
    const rate = rateFor(q, diet);
    if (rate !== null) {
      const covers = Math.max(headcount, q.min_guarantee_covers ?? 0);
      if (covers > headcount) {
        notes.push(`billed for ${covers}, minimum guarantee`);
      }
      base = covers * rate;
    }
  } else if (q.pricing_model === "package") {
    if (q.package_total !== null) {
      base = q.package_total;
      if (q.package_covers === null)
        return {
          total: base,
          isPreTax: q.taxes_included !== true,
          blocker: "package capacity unstated",
          notes,
        };
      if (q.package_covers !== null && q.package_covers > headcount) {
        notes.push(
          `package covers ${q.package_covers}, paying for unused seats`,
        );
      }
      if (q.package_covers !== null && q.package_covers < headcount) {
        // Not a cheaper answer to the same question, a cheaper answer to a
        // smaller one. Ranking it against full quotes on price alone is wrong.
        return {
          total: base,
          isPreTax: q.taxes_included !== true,
          blocker: `feeds only ${q.package_covers} of ${headcount}`,
          notes,
        };
      }
    }
  } else if (q.pricing_model === "hall_plus_fnb") {
    const rate = rateFor(q, diet);
    if (rate !== null && q.hall_rent !== null) {
      const covers = Math.max(headcount, q.min_guarantee_covers ?? 0);
      if (covers > headcount)
        notes.push(`billed for ${covers}, minimum guarantee`);
      const atActuals = covers * rate;
      const fnb = Math.max(atActuals, q.fnb_minimum ?? 0);
      if (q.fnb_minimum !== null && q.fnb_minimum > atActuals) {
        notes.push("F&B minimum bites");
      }
      base = q.hall_rent + fnb;
    }
  }

  if (base === null) {
    return {
      total: null,
      isPreTax: false,
      blocker:
        (q.pricing_model === "per_head" ||
          q.pricing_model === "hall_plus_fnb") &&
        rateFor(q, diet) === null
          ? `${diet} rate not stated`
          : "no usable price",
      notes,
    };
  }

  const uncertainty =
    q.pricing_model === "per_head" && q.min_guarantee_covers === null
      ? "minimum cover count unstated"
      : null;
  if (q.taxes_included === true) {
    return { total: base, isPreTax: false, blocker: uncertainty, notes };
  }
  if (q.taxes_included === false && q.tax_percent !== null) {
    return {
      total: Math.round(base * (1 + q.tax_percent / 100)),
      isPreTax: false,
      blocker: uncertainty,
      notes,
    };
  }

  // Tax is extra but no rate was stated, or tax was never mentioned at all.
  // This is the grey cell, and it is what the follow-up asks about.
  return { total: base, isPreTax: true, blocker: "tax unknown", notes };
}

// Material fields worth spending a follow-up email on. Asking about everything
// unstated would read as an interrogation and get ignored.
const MATERIAL = [
  "taxes_included",
  "tax_percent",
  "lead_time_days",
  "min_guarantee_covers",
] as const;

export function gapsWorthAsking(
  q: ExtractedQuote & { lead_time_days: number | null },
): string[] {
  // Never chase a venue that already said it is booked, and never argue with an
  // autoresponder. Both would be emails to nobody.
  if (q.reply_kind === "declined" || q.reply_kind === "auto_reply") return [];

  const gaps: string[] = [];
  if (q.taxes_included === null) gaps.push("taxes_included");
  else if (q.taxes_included === false && q.tax_percent === null) {
    gaps.push("tax_percent");
  }
  if (q.lead_time_days === null) gaps.push("lead_time_days");
  if (q.pricing_model === "per_head" && q.min_guarantee_covers === null) {
    gaps.push("min_guarantee_covers");
  }
  return gaps.filter((g) => (MATERIAL as readonly string[]).includes(g));
}

export function quoteTier(n: Normalised | null) {
  return n?.total == null
    ? 3
    : n.blocker
      ? n.isPreTax && n.blocker === "tax unknown"
        ? 1
        : 2
      : 0;
}
