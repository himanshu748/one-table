import { describe, it, expect } from "vitest";
import {
  normalise,
  quoteTier,
  gapsWorthAsking,
  type ExtractedQuote,
} from "../convex/lib/normalise";
const base: ExtractedQuote & { lead_time_days: number | null } = {
  reply_kind: "quote",
  pricing_model: "per_head",
  per_head_veg: 1000,
  per_head_nonveg: null,
  package_total: null,
  package_covers: null,
  hall_rent: null,
  fnb_minimum: null,
  min_guarantee_covers: 100,
  taxes_included: true,
  tax_percent: null,
  lead_time_days: 10,
};
describe("comparison correctness", () => {
  it("labels missing guaranteed covers as uncertain", () =>
    expect(
      normalise({ ...base, min_guarantee_covers: null }, 120).blocker,
    ).toBe("minimum cover count unstated"));
  it("never substitutes a vegetarian rate for non-vegetarian", () =>
    expect(normalise(base, 120, "nonveg").total).toBeNull());
  it("never substitutes a non-vegetarian rate for vegetarian", () =>
    expect(
      normalise(
        { ...base, per_head_veg: null, per_head_nonveg: 1400 },
        120,
        "veg",
      ).total,
    ).toBeNull());
  it("bills guaranteed covers", () =>
    expect(normalise(base, 60).total).toBe(100000));
  it("accounts for covers and food minimum in hall quotes", () =>
    expect(
      normalise(
        {
          ...base,
          pricing_model: "hall_plus_fnb",
          hall_rent: 20000,
          fnb_minimum: 50000,
        },
        60,
      ).total,
    ).toBe(120000));
  it("does not infer tax inclusion from a tax percentage", () =>
    expect(
      normalise({ ...base, taxes_included: null, tax_percent: 18 }, 120)
        .isPreTax,
    ).toBe(true));
  it("adds explicitly extra tax", () =>
    expect(
      normalise({ ...base, taxes_included: false, tax_percent: 18 }, 120).total,
    ).toBe(141600));
  it("keeps a small package out of comparable totals", () =>
    expect(
      normalise(
        {
          ...base,
          pricing_model: "package",
          package_total: 90000,
          package_covers: 100,
        },
        120,
      ).blocker,
    ).toBe("feeds only 100 of 120"));
  it("requires package capacity", () =>
    expect(
      normalise(
        { ...base, pricing_model: "package", package_total: 90000 },
        120,
      ).blocker,
    ).toBe("package capacity unstated"));
  it("does not rank a range as a fixed quote", () =>
    expect(
      normalise({ ...base, unstated: ["price_range"] }, 120).total,
    ).toBeNull());
  it("ranks known inclusive totals before lower unconfirmed prices", () =>
    expect(
      quoteTier(normalise({ ...base, taxes_included: null }, 100)),
    ).toBeGreaterThan(quoteTier(normalise(base, 120))));
  it.each([0, -1, 1.5, NaN, 2001])("rejects invalid headcounts %s", (n) =>
    expect(normalise(base, n).total).toBeNull(),
  );
  it.each([-2, NaN, Infinity])("rejects invalid quoted amount %s", (n) =>
    expect(normalise({ ...base, per_head_veg: n }, 120).total).toBeNull(),
  );
  it("does not chase a declined venue", () => {
    expect(
      normalise({ ...base, reply_kind: "declined" }, 120).total,
    ).toBeNull();
    expect(
      gapsWorthAsking({
        ...base,
        reply_kind: "declined",
        lead_time_days: null,
      }),
    ).toEqual([]);
  });
});
