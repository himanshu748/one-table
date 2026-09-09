import { v } from "convex/values";
import { query } from "./_generated/server";
import {
  normalise,
  gapsWorthAsking,
  quoteTier,
  type ExtractedQuote,
} from "./lib/normalise";

import { ownedEvent } from "./lib/access";
import { eventDoc, quoteDoc, normalised } from "./validators";

// The live board. Everything the frontend renders comes from here, so a webhook
// landing a reply updates every open tab with no polling.
//
// Headcount is an argument rather than stored state: the buyer drags the slider
// and the whole ranking recomputes, which is the point of the product. A package
// priced for 150 is the best deal at 150 and the wrong answer at 200.
export const forEvent = query({
  args: {
    eventId: v.id("events"),
    headcount: v.optional(v.number()),
    diet: v.optional(v.union(v.literal("veg"), v.literal("nonveg"))),
  },
  returns: v.object({
    event: eventDoc,
    headcount: v.number(),
    diet: v.union(v.literal("veg"), v.literal("nonveg")),
    rows: v.array(
      v.object({
        vendorId: v.id("vendors"),
        vendorName: v.string(),
        email: v.string(),
        sourceUrl: v.union(v.string(), v.null()),
        discoveryExcerpt: v.union(v.string(), v.null()),
        shortlisted: v.boolean(),
        status: v.string(),
        deliveryState: v.union(v.string(), v.null()),
        autoFollowup: v.boolean(),
        followupState: v.union(v.string(), v.null()),
        followupError: v.union(v.string(), v.null()),
        deliveryError: v.union(v.string(), v.null()),
        quote: v.union(quoteDoc, v.null()),
        norm: v.union(normalised, v.null()),
        gaps: v.array(v.string()),
        pricingFlag: v.union(v.string(), v.null()),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const event = await ownedEvent(ctx, args.eventId);

    const headcount = args.headcount ?? event.headcount;
    const diet = args.diet ?? (event.dietary === "nonveg" ? "nonveg" : "veg");

    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(20);

    const live = await ctx.db
      .query("quotes")
      .withIndex("by_event_live", (q) =>
        q.eq("eventId", args.eventId).eq("supersededAt", null),
      )
      .take(20);
    const byVendor = new Map(live.map((q) => [q.vendorId, q]));

    const rows = vendors.map((vendor) => {
      const quote = byVendor.get(vendor._id);
      if (!quote) {
        return {
          vendorId: vendor._id,
          vendorName: vendor.name,
          email: vendor.email,
          sourceUrl: vendor.sourceUrl,
          discoveryExcerpt: vendor.discoveryExcerpt ?? null,
          shortlisted: vendor.shortlisted ?? false,
          status: vendor.status,
          deliveryState: vendor.outboundState ?? null,
          autoFollowup: vendor.autoFollowup ?? false,
          followupState: vendor.followupState ?? null,
          followupError: vendor.followupError ?? null,
          deliveryError: vendor.error ?? null,
          quote: null,
          norm: null,
          gaps: [] as string[],
          pricingFlag: null as string | null,
        };
      }
      const extracted = quote as unknown as ExtractedQuote & {
        lead_time_days: number | null;
      };
      return {
        vendorId: vendor._id,
        vendorName: vendor.name,
        email: vendor.email,
        sourceUrl: vendor.sourceUrl,
        discoveryExcerpt: vendor.discoveryExcerpt ?? null,
        shortlisted: vendor.shortlisted ?? false,
        status: vendor.status,
        deliveryState: vendor.outboundState ?? null,
        autoFollowup: vendor.autoFollowup ?? false,
        followupState: vendor.followupState ?? null,
        followupError: vendor.followupError ?? null,
        deliveryError: vendor.error ?? null,
        quote,
        norm: normalise(extracted, headcount, diet),
        gaps: gapsWorthAsking(extracted),
        pricingFlag: quote.pricingFlag,
      };
    });

    // Same three tiers the UI ranks by, computed here so every client agrees:
    // comparable quotes, then quotes that do not cover the headcount, then
    // vendors who have not given a number at all.
    const tier = (r: (typeof rows)[number]) => quoteTier(r.norm);
    rows.sort((a, b) => {
      const t = tier(a) - tier(b);
      if (t !== 0) return t;
      if (a.norm?.total == null || b.norm?.total == null) return 0;
      return a.norm.total - b.norm.total;
    });

    return { event, headcount, diet, rows };
  },
});
