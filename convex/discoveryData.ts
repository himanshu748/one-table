import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { eventDoc } from "./validators";
export const context = internalQuery({
  args: { eventId: v.id("events") },
  returns: v.union(eventDoc, v.null()),
  handler: async (ctx, { eventId }) => await ctx.db.get(eventId),
});
export const finish = internalMutation({
  args: {
    eventId: v.id("events"),
    vendors: v.array(
      v.object({ name: v.string(), email: v.string(), sourceUrl: v.string() }),
    ),
    error: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, { eventId, vendors, error }) => {
    const prior = await ctx.db
      .query("vendors")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .take(20);
    const emails = new Set(prior.map((v) => v.email));
    let count = prior.length;
    for (const vendor of vendors.slice(0, 5)) {
      if (count >= 10 || emails.has(vendor.email)) continue;
      emails.add(vendor.email);
      count++;
      await ctx.db.insert("vendors", {
        eventId,
        ...vendor,
        publishedPricing: null,
        threadId: null,
        status: "discovered",
        lastOutboundAt: null,
        lastInboundAt: null,
        nudgeCount: 0,
      });
    }
    await ctx.db.patch(eventId, {
      discoveryStatus: error ? "failed" : "complete",
      discoveryError: error ?? undefined,
    });
    return null;
  },
});
