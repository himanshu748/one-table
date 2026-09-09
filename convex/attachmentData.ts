import { v, ConvexError } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { ownedEvent } from "./lib/access";
import { internal } from "./_generated/api";
import { limits } from "./limits";
export const reserve = internalMutation({
  args: { vendorId: v.id("vendors") },
  returns: v.null(),
  handler: async (ctx, { vendorId }) => {
    const venue = await ctx.db.get(vendorId);
    if (!venue) throw new ConvexError("Venue not found.");
    const event = await ownedEvent(ctx, venue.eventId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
      .take(20);
    if (messages.length >= 20)
      throw new ConvexError("This venue has reached its twenty-message limit.");
    await limits.limit(ctx, "uploads", { key: event.userId, throws: true });
    return null;
  },
});
export const record = internalMutation({
  args: {
    vendorId: v.id("vendors"),
    storageId: v.id("_storage"),
    name: v.string(),
  },
  returns: v.id("messages"),
  handler: async (ctx, { vendorId, storageId, name }) => {
    const venue = await ctx.db.get(vendorId);
    if (!venue) throw new ConvexError("Venue not found.");
    await ownedEvent(ctx, venue.eventId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
      .take(20);
    if (messages.length >= 20)
      throw new ConvexError("This venue has reached its twenty-message limit.");
    const key = `upload:${storageId}`;
    const id = await ctx.db.insert("messages", {
      vendorId,
      eventId: venue.eventId,
      direction: "in",
      agentmailMessageId: key,
      subject: `Uploaded quote: ${name}`,
      body: "Original quote supplied as an attachment.",
      attachmentName: name,
      attachmentIds: [storageId],
      receivedAt: Date.now(),
      askedAbout: [],
      extractionStatus: "queued",
    });
    await ctx.db.patch(vendorId, {
      status: "replied",
      lastInboundAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.extract.fromMessage, {
      agentmailMessageId: key,
    });
    return id;
  },
});
export const forMessage = query({
  args: { messageId: v.id("messages") },
  returns: v.array(v.object({ url: v.string(), name: v.string() })),
  handler: async (ctx, { messageId }) => {
    const message = await ctx.db.get(messageId);
    if (!message) throw new ConvexError("Message not found.");
    await ownedEvent(ctx, message.eventId);
    const files = [];
    for (const id of message.attachmentIds.slice(0, 3)) {
      const url = await ctx.storage.getUrl(id);
      if (url)
        files.push({
          url,
          name: message.attachmentName || "Original attachment",
        });
    }
    return files;
  },
});
