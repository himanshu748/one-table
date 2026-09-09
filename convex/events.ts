import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import {
  mutation,
  query,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { limits } from "./limits";
import { ownedEvent } from "./lib/access";
export const create = mutation({
  args: {
    neighbourhood: v.optional(v.string()),
    dateFlexible: v.optional(v.boolean()),
    eventType: v.optional(v.string()),
    budgetHint: v.optional(v.number()),
    needs: v.optional(v.array(v.string())),
    autoDiscover: v.optional(v.boolean()),
    title: v.string(),
    city: v.string(),
    eventDate: v.string(),
    headcount: v.number(),
    dietary: v.union(v.literal("veg"), v.literal("nonveg"), v.literal("both")),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Start a private guest session first.");
    if (
      !args.title.trim() ||
      args.title.length > 100 ||
      !args.city.trim() ||
      args.city.length > 80 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(args.eventDate) ||
      !Number.isFinite(Date.parse(args.eventDate)) ||
      !Number.isInteger(args.headcount) ||
      args.headcount < 1 ||
      args.headcount > 2000
    )
      throw new ConvexError(
        "Enter an event, city, valid date and 1 to 2,000 guests.",
      );
    if ((args.neighbourhood?.length ?? 0) > 80 || (args.eventType?.length ?? 0) > 40 || (args.needs?.length ?? 0) > 8 || args.needs?.some(n=>!n.trim() || n.length>80) || (args.budgetHint !== undefined && (!Number.isFinite(args.budgetHint) || args.budgetHint <= 0 || args.budgetHint > 100000000))) throw new ConvexError("Check your area, requirements and total budget (INR).");
    const recent = await ctx.db
      .query("events")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
    if (recent.length === 10 && recent[9]._creationTime > Date.now() - 86400000)
      throw new ConvexError(
        "You can create ten events per day. Return to an existing event.",
      );
    const {autoDiscover, ...brief} = args;
    const id = await ctx.db.insert("events", {
      ...brief,
      title: args.title.trim(),
      city: args.city.trim(),
      userId,
      needs: args.needs ?? [],
      budgetHint: args.budgetHint ?? null,
      agentInboxId: process.env.AGENTMAIL_INBOX_ID ?? null,
    });
    if (autoDiscover && process.env.FIRECRAWL_API_KEY) {
      const quota = await limits.limit(ctx,"searches",{key:userId});
      const global = quota.ok && await limits.limit(ctx,"searchGlobal");
      if (global && global.ok) {
        await ctx.db.patch(id,{discoveryStatus:"searching"});
        await ctx.scheduler.runAfter(0,internal.discover.findVendors,{eventId:id});
      } else await ctx.db.patch(id,{discoveryStatus:"failed",discoveryError:"Event saved. Search allowance reached; try searching later."});
    }
    return id;
  },
});
export const list = query({
  args: {},
  returns: v.array(
    v.object({ id: v.id("events"), title: v.string(), city: v.string() }),
  ),
  handler: async (ctx) => {
    const id = await getAuthUserId(ctx);
    if (!id) return [];
    return (
      await ctx.db
        .query("events")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .order("desc")
        .take(20)
    ).map((e) => ({ id: e._id, title: e.title, city: e.city }));
  },
});
export const discover = mutation({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, { eventId }) => {
    const event = await ownedEvent(ctx, eventId);
    if (!process.env.FIRECRAWL_API_KEY)
      throw new ConvexError("Venue search is not configured yet.");
    if (event.discoveryStatus === "searching") return null;
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .take(20);
    if (vendors.length >= 10)
      throw new ConvexError(
        "This event already has ten venues. Review the shortlist first.",
      );
    await limits.limit(ctx, "searches", {key:event.userId, throws:true});
    await limits.limit(ctx, "searchGlobal", {throws:true});
    await ctx.db.patch(eventId, {
      discoveryStatus: "searching",
      discoveryError: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.discover.findVendors, { eventId });
    return null;
  },
});
export const configuration = query({
  args: {},
  returns: v.object({
    discovery: v.boolean(),
    extraction: v.boolean(),
    inbox: v.boolean(),
  }),
  handler: async () => ({
    discovery: !!process.env.FIRECRAWL_API_KEY,
    extraction:
      !!process.env.OPENAI_API_KEY || !!process.env.AI_GATEWAY_API_KEY,
    inbox:
      !!process.env.AGENTMAIL_API_KEY &&
      !!process.env.AGENTMAIL_INBOX_ID &&
      !!process.env.AGENTMAIL_WEBHOOK_SECRET,
  }),
});
