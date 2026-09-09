import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v, ConvexError } from "convex/values";
import { mutation, internalMutation, internalQuery } from "./_generated/server";
import { ownedEvent } from "./lib/access";
import { internal } from "./_generated/api";
import { canSend } from "./lib/sending";
import { limits } from "./limits";
import { eventDoc } from "./validators";
export const add = mutation({
  args: { eventId: v.id("events"), name: v.string(), email: v.string() },
  returns: v.id("vendors"),
  handler: async (ctx, args) => {
    await ownedEvent(ctx, args.eventId);
    if (
      !args.name.trim() ||
      args.name.length > 120 ||
      args.email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(args.email)
    )
      throw new ConvexError("Enter the venue name and a valid email address.");
    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .take(20);
    const match = vendors.find(
      (v) => v.email === args.email.trim().toLowerCase(),
    );
    if (match) return match._id;
    if (vendors.length >= 10)
      throw new ConvexError("Compare up to ten venues per event.");
    return await ctx.db.insert("vendors", {
      ...args,
      name: args.name.trim(),
      email: args.email.trim().toLowerCase(),
      sourceUrl: null,
      publishedPricing: null,
      threadId: null,
      status: "discovered",
      lastOutboundAt: null,
      lastInboundAt: null,
      nudgeCount: 0,
    });
  },
});
export const forOutbound = internalQuery({
  args: { vendorId: v.id("vendors") },
  returns: v.union(
    v.null(),
    v.object({
      email: v.string(),
      sendingAllowed: v.boolean(),
      inboxId: v.union(v.string(), v.null()),
      threadId: v.union(v.string(), v.null()),
      lastMessageId: v.union(v.string(), v.null()),
      lastSubject: v.string(),
      alreadyAsked: v.array(v.string()),
      publishedCapacity: v.union(v.number(), v.null()),
      event: eventDoc,
    }),
  ),
  handler: async (ctx, { vendorId }) => {
    const vendor = await ctx.db.get(vendorId);
    if (!vendor) return null;
    const event = await ctx.db.get(vendor.eventId);
    if (!event) return null;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_vendor", (q) => q.eq("vendorId", vendorId))
      .order("desc")
      .take(20);
    const last = messages.find(
      (m) =>
        m.direction === "in" &&
        !/^(manual:|upload:)/.test(m.agentmailMessageId),
    );
    return {
      email: vendor.email,
      sendingAllowed: await canSend(ctx, event.userId, vendor.email),
      inboxId: event.agentInboxId ?? process.env.AGENTMAIL_INBOX_ID ?? null,
      threadId: vendor.threadId,
      lastMessageId: last?.agentmailMessageId ?? null,
      lastSubject: last?.subject ?? event.title,
      alreadyAsked: [...new Set(messages.flatMap((m) => m.askedAbout))],
      publishedCapacity: vendor.publishedPricing?.capacity ?? null,
      event,
    };
  },
});
export const recordOutbound = internalMutation({
  args: {
    vendorId: v.id("vendors"),
    agentmailMessageId: v.string(),
    threadId: v.optional(v.string()),
    subject: v.string(),
    body: v.string(),
    askedAbout: v.array(v.string()),
    status: v.union(v.literal("rfq_sent"), v.literal("followup_sent")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) throw new Error("Venue not found");
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_agentmail_id", (q) =>
        q.eq("agentmailMessageId", args.agentmailMessageId),
      )
      .unique();
    if (existing) return null;
    await ctx.db.insert("messages", {
      vendorId: vendor._id,
      eventId: vendor.eventId,
      direction: "out",
      agentmailMessageId: args.agentmailMessageId,
      subject: args.subject,
      body: args.body,
      askedAbout: args.askedAbout,
      attachmentIds: [],
      receivedAt: Date.now(),
    });
    await ctx.db.patch(vendor._id, {
      status: args.status,
      ...(args.status === "followup_sent"
        ? { followupState: "sent", followupError: undefined }
        : { outboundState: "sent" }),
      lastOutboundAt: Date.now(),
      ...(args.threadId ? { threadId: args.threadId } : {}),
    });
    return null;
  },
});

export const approveRfq = mutation({
  args: { vendorId: v.id("vendors"), autoFollowup: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { vendorId, autoFollowup }) =>
    approve(ctx, vendorId, autoFollowup),
});
export const claimSend = internalMutation({
  args: { vendorId: v.id("vendors") },
  returns: v.boolean(),
  handler: async (ctx, { vendorId }) => {
    const v = await ctx.db.get(vendorId);
    if (v?.outboundState !== "queued") return false;
    await ctx.db.patch(vendorId, { outboundState: "sending" });
    return true;
  },
});
export const sendFailed = internalMutation({
  args: { vendorId: v.id("vendors") },
  returns: v.null(),
  handler: async (ctx, { vendorId }) => {
    await ctx.db.patch(vendorId, {
      outboundState: "uncertain",
      error:
        "Delivery could not be confirmed. Check the inbox before sending again.",
    });
    return null;
  },
});

export const setAutoFollowup = mutation({
  args: { vendorId: v.id("vendors"), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { vendorId, enabled }) => {
    const vendor = await ctx.db.get(vendorId);
    if (!vendor) throw new ConvexError("Venue not found.");
    await ownedEvent(ctx, vendor.eventId);
    await ctx.db.patch(vendorId, { autoFollowup: enabled });
    return null;
  },
});
export const claimFollowup = internalMutation({
  args: { vendorId: v.id("vendors"), messageId: v.id("messages") },
  returns: v.boolean(),
  handler: async (ctx, { vendorId, messageId }) => {
    const vendor = await ctx.db.get(vendorId);
    if (!vendor || vendor.followupState !== "queued") return false;
    const live = await ctx.db
      .query("quotes")
      .withIndex("by_vendor_live", (q) =>
        q.eq("vendorId", vendorId).eq("supersededAt", null),
      )
      .first();
    const event = await ctx.db.get(vendor.eventId);
    if (
      !vendor.autoFollowup ||
      !event ||
      !(await canSend(ctx, event.userId, vendor.email)) ||
      live?.messageId !== messageId ||
      live.reply_kind !== "quote"
    ) {
      await ctx.db.patch(vendorId, { followupState: "cancelled" });
      return false;
    }
    const quota = await limits.limit(ctx, "mailGlobal");
    if (!quota.ok) {
      await ctx.db.patch(vendorId, {
        followupState: "cancelled",
        followupError:
          "Daily sending limit reached. Review the reply manually.",
      });
      return false;
    }
    await ctx.db.patch(vendorId, { followupState: "sending" });
    return true;
  },
});
export const followupFailed = internalMutation({
  args: { vendorId: v.id("vendors") },
  returns: v.null(),
  handler: async (ctx, { vendorId }) => {
    await ctx.db.patch(vendorId, {
      followupState: "uncertain",
      followupError:
        "Follow-up delivery could not be confirmed. It will not be retried automatically.",
    });
    return null;
  },
});

async function approve(
  ctx: MutationCtx,
  vendorId: Id<"vendors">,
  autoFollowup?: boolean,
) {
  const vendor = await ctx.db.get(vendorId);
  if (!vendor) throw new ConvexError("Venue not found.");
  const event = await ownedEvent(ctx, vendor.eventId);
  if (!(await canSend(ctx, event.userId, vendor.email)))
    throw new ConvexError(
      "Verify your email to send enquiries. Live sending must also be enabled for this pilot.",
    );
  if (vendor.outboundState || vendor.lastOutboundAt)
    throw new ConvexError(
      "This enquiry is already queued or sent. Check its delivery state.",
    );
  const venues = await ctx.db
    .query("vendors")
    .withIndex("by_event", (q) => q.eq("eventId", event._id))
    .take(20);
  if (venues.filter((v) => v.outboundState || v.lastOutboundAt).length >= 3)
    throw new ConvexError(
      "You can contact three venues per event during the public trial.",
    );
  await limits.limit(ctx, "enquiries", { key: event.userId, throws: true });
  await limits.limit(ctx, "recipient", { key: vendor.email, throws: true });
  await limits.limit(ctx, "mailGlobal", { throws: true });
  await ctx.db.patch(vendorId, {
    outboundState: "queued",
    autoFollowup: autoFollowup === true,
  });
  await ctx.scheduler.runAfter(0, internal.outbound.sendRfq, { vendorId });
  return null;
}

export const shortlist = mutation({
  args: { vendorId: v.id("vendors"), selected: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { vendorId, selected }) => {
    const venue = await ctx.db.get(vendorId);
    if (!venue) throw new ConvexError("Venue not found.");
    await ownedEvent(ctx, venue.eventId);
    await ctx.db.patch(vendorId, { shortlisted: selected });
    return null;
  },
});
export const approveBatch = mutation({
  args: {
    eventId: v.id("events"),
    vendorIds: v.array(v.id("vendors")),
    autoFollowup: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, { eventId, vendorIds, autoFollowup }) => {
    await ownedEvent(ctx, eventId);
    if (
      vendorIds.length < 1 ||
      vendorIds.length > 3 ||
      new Set(vendorIds).size !== vendorIds.length
    )
      throw new ConvexError("Select one to three different venues.");
    for (const id of vendorIds) {
      const venue = await ctx.db.get(id);
      if (!venue || venue.eventId !== eventId)
        throw new ConvexError("Venue is not in this event.");
      await approve(ctx, id, autoFollowup);
    }
    return null;
  },
});
