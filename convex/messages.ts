import { v, ConvexError } from "convex/values";
import {
  internalQuery,
  internalMutation,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { ownedEvent } from "./lib/access";
import { messageDoc, quoteDoc } from "./validators";
export const forExtraction = internalQuery({
  args: { agentmailMessageId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      attachmentIds: v.array(v.id("_storage")),
      messageId: v.id("messages"),
      vendorId: v.id("vendors"),
      subject: v.string(),
      body: v.string(),
      headcount: v.number(),
      eventDate: v.string(),
      publishedPerHead: v.union(v.number(), v.null()),
    }),
  ),
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .withIndex("by_agentmail_id", (q) =>
        q.eq("agentmailMessageId", args.agentmailMessageId),
      )
      .unique();
    if (
      !message ||
      message.direction !== "in" ||
      message.extractionStatus === "complete"
    )
      return null;
    const event = await ctx.db.get(message.eventId);
    const vendor = await ctx.db.get(message.vendorId);
    if (!event || !vendor) return null;
    return {
      attachmentIds: message.attachmentIds,
      messageId: message._id,
      vendorId: vendor._id,
      subject: message.subject,
      body: message.replyText ?? message.body,
      headcount: event.headcount,
      eventDate: event.eventDate,
      publishedPerHead: vendor.publishedPricing?.perHeadFrom ?? null,
    };
  },
});
export const failed = internalMutation({
  args: { agentmailMessageId: v.string(), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const m = await ctx.db
      .query("messages")
      .withIndex("by_agentmail_id", (q) =>
        q.eq("agentmailMessageId", args.agentmailMessageId),
      )
      .unique();
    if (m && m.extractionStatus !== "complete")
      await ctx.db.patch(m._id, {
        extractionStatus: "failed",
        extractionError: args.error,
      });
    return null;
  },
});
export const addReply = mutation({
  args: {
    vendorId: v.id("vendors"),
    subject: v.string(),
    body: v.string(),
    operationId: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new ConvexError("Venue not found.");
    await ownedEvent(ctx, vendor.eventId);
    if (!process.env.OPENAI_API_KEY && !process.env.AI_GATEWAY_API_KEY)
      throw new ConvexError("Quote extraction is not configured yet.");
    if (
      !args.body.trim() ||
      args.body.length > 20000 ||
      args.subject.length > 200 ||
      !/^[a-f0-9-]{36}$/.test(args.operationId)
    )
      throw new ConvexError("Paste a reply of up to 20,000 characters.");
    const key = `manual:${vendor._id}:${args.operationId}`;
    const prior = await ctx.db
      .query("messages")
      .withIndex("by_agentmail_id", (q) => q.eq("agentmailMessageId", key))
      .unique();
    if (prior) return prior._id;
    const recent = await ctx.db
      .query("messages")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendor._id))
      .order("desc")
      .take(20);
    if (recent.length >= 20)
      throw new ConvexError(
        "This venue has reached the twenty-message case limit.",
      );
    const id = await ctx.db.insert("messages", {
      vendorId: vendor._id,
      eventId: vendor.eventId,
      direction: "in",
      agentmailMessageId: key,
      subject: args.subject,
      body: args.body,
      attachmentIds: [],
      receivedAt: Date.now(),
      askedAbout: [],
      extractionStatus: "queued",
    });
    await ctx.db.patch(vendor._id, {
      status: "replied",
      lastInboundAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.extract.fromMessage, {
      agentmailMessageId: key,
    });
    return id;
  },
});
export const list = query({
  args: { vendorId: v.id("vendors") },
  returns: v.array(messageDoc),
  handler: async (ctx, { vendorId }) => {
    const vendor = await ctx.db.get(vendorId);
    if (!vendor) throw new ConvexError("Venue not found.");
    await ownedEvent(ctx, vendor.eventId);
    return await ctx.db
      .query("messages")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
      .order("desc")
      .take(20);
  },
});
export const retry = mutation({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const m = await ctx.db.get(messageId);
    if (!m) throw new ConvexError("Reply not found.");
    await ownedEvent(ctx, m.eventId);
    if (m.extractionStatus !== "failed") return null;
    await ctx.db.patch(messageId, {
      extractionStatus: "queued",
      extractionError: undefined,
    });
    await ctx.scheduler.runAfter(0, internal.extract.fromMessage, {
      agentmailMessageId: m.agentmailMessageId,
    });
    return null;
  },
});

export const quoteHistory = query({
  args:{vendorId:v.id("vendors")},returns:v.array(quoteDoc),
  handler:async(ctx,{vendorId})=>{
    const venue=await ctx.db.get(vendorId);if(!venue)throw new ConvexError("Venue not found.");
    await ownedEvent(ctx,venue.eventId);
    return await ctx.db.query("quotes").withIndex("by_vendor",q=>q.eq("vendorId",vendorId)).order("desc").take(20);
  }
});
