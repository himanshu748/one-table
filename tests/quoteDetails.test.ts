import { describe, expect, it } from "vitest";
import {
  decisionUnknowns,
  quoteTermChanges,
  toCsv,
  taxBasis,
  type DecisionQuote,
} from "../src/quoteDetails";
import { normalise } from "../convex/lib/normalise";
const quote: DecisionQuote = {
  reply_kind: "quote",
  pricing_model: "package",
  package_total: 150000,
  package_covers: 150,
  per_head_veg: null,
  per_head_nonveg: null,
  hall_rent: null,
  fnb_minimum: null,
  min_guarantee_covers: null,
  taxes_included: true,
  tax_percent: null,
  lead_time_days: 10,
  inclusions: ["Hall", "Buffet"],
  exclusions: ["Decoration"],
  unstated: [
    "per_head_veg",
    "hall_rent",
    "tax_percent",
    "min_guarantee_covers",
  ],
};
describe("quote decision evidence", () => {
  it.each([null, 80])(
    "retains the tax qualification on a package with capacity %s",
    (package_covers) => {
      const q = { ...quote, package_covers, taxes_included: null };
      const norm = normalise(q, 120);
      expect(norm.blocker).toBeTruthy();
      expect(
        toCsv([[String(norm.total), norm.blocker!, taxBasis(norm)]]),
      ).toContain("Before tax; final tax unconfirmed");
    },
  );
  it("does not call irrelevant nullable package fields missing", () => {
    expect(decisionUnknowns(quote, normalise(quote, 120), "veg")).toEqual([]);
  });
  it("preserves non-schema unknown terms and capacity blockers", () => {
    const q = { ...quote, unstated: ["cancellation_policy"] };
    expect(decisionUnknowns(q, normalise(q, 120), "veg")).toEqual([
      "cancellation policy",
    ]);
    expect(decisionUnknowns(quote, normalise(quote, 200), "veg")).toContain(
      "feeds only 150 of 200",
    );
  });
  it("shows both missing hall minima even when arithmetic exposes one blocker", () => {
    const q = {
      ...quote,
      pricing_model: "hall_plus_fnb" as const,
      per_head_veg: 1000,
      hall_rent: 25000,
    };
    expect(decisionUnknowns(q, normalise(q, 120), "veg")).toEqual([
      "Minimum billed guests",
      "Minimum food and beverage spend",
    ]);
  });
  it("surfaces a changed exclusion even when every amount is unchanged", () => {
    expect(
      quoteTermChanges(
        { ...quote, exclusions: ["Decoration", "Service charge"] },
        quote,
      ),
    ).toEqual(["exclusions"]);
    expect(
      quoteTermChanges({ ...quote, inclusions: ["Buffet", "Hall"] }, quote),
    ).toEqual([]);
    expect(quoteTermChanges({ ...quote, exclusions: [] }, quote)).toEqual([
      "exclusions",
    ]);
  });
  it("exports prose safely, including whitespace-prefixed spreadsheet formulas", () => {
    expect(toCsv([["  =SUM(A1)", "Line one\nLine two", 'a "quote"']])).toBe(
      '"\'  =SUM(A1)","Line one\nLine two","a ""quote"""',
    );
  });
});
