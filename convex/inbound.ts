import { v } from "convex/values";
import { internal } from "./_generated/api";
import { mergeTerms } from "./lib/mergeTerms";
import { extractedQuote } from "./validators";
import { internalMutation } from "./_generated/server";
import {
  normalise,
  gapsWorthAsking,
  type ExtractedQuote,
} from "./lib/normalise";

// Called by the AgentMail webhook in http.ts. Deliberately does no thinking:
// it writes the raw reply and returns, so AgentMail gets its 200 quickly and
// does not retry while a model call is in flight.
export const recordReply = internalMutation({
  args: {
    agentmailMessageId: v.string(),
    threadId: v.string(),
    inboxId: v.string(),
    from: v.string(),
    subject: v.string(),
    body: v.string(),
    replyText: v.optional(v.string()),
    receivedAt: v.number(),
  },
  returns: v.union(
    v.null(),
    v.object({ messageId: v.id("messages"), duplicate: v.boolean() }),
  ),
  handler: async (ctx, args) => {
    // AgentMail can deliver the same message more than once. The thread is the
    // vendor thread identity. Sender and inbox are also checked below;
    // alternate sales addresses require manual review.
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_agentmail_id", (q) =>
        q.eq("agentmailMessageId", args.agentmailMessageId),
      )
      .first();
    if (existing) return { messageId: existing._id, duplicate: true };

    const vendor = await ctx.db
      .query("vendors")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .first();
    if (!vendor) return null;
    const event = await ctx.db.get(vendor.eventId);
    if (
      !event ||
      args.inboxId !== (event.agentInboxId ?? process.env.AGENTMAIL_INBOX_ID)
    )
      return null;
    const sender = args.from.match(/<([^>]+)>/)?.[1] ?? args.from;
    if (sender.trim().toLowerCase() !== vendor.email.toLowerCase()) return null;
    if (args.body.length > 20000 || (args.replyText?.length ?? 0) > 20000) return null;

    const messageId = await ctx.db.insert("messages", {
      vendorId: vendor._id,
      eventId: vendor.eventId,
      direction: "in",
      agentmailMessageId: args.agentmailMessageId,
      subject: args.subject,
      body: args.body,
      replyText: args.replyText,
      attachmentIds: [],
      receivedAt: args.receivedAt,
      askedAbout: [],
      extractionStatus: "queued",
    });

    await ctx.db.patch(vendor._id, {
      status: "replied",
      lastInboundAt: args.receivedAt,
    });

    await ctx.scheduler.runAfter(0, internal.extract.fromMessage, {
      agentmailMessageId: args.agentmailMessageId,
    });
    return { messageId, duplicate: false };
  },
});

// Called by the extraction action once the model has read the reply. The
// arithmetic runs here rather than in the action so the stored total and the
// stored fields can never disagree.
export const saveQuote = internalMutation({
  args: {
    messageId: v.id("messages"),
    extracted: extractedQuote,
    pricingFlag: v.union(v.string(), v.null()),
  },
  returns: v.object({ gaps: v.array(v.string()) }),
  handler: async (ctx, args) => {
    const message = await ctx.db.get(args.messageId);
    if (!message) throw new Error("message not found");
    const event = await ctx.db.get(message.eventId);
    if (!event) throw new Error("event not found");

    const duplicate = await ctx.db
      .query("quotes")
      .withIndex("by_message", (q) => q.eq("messageId", args.messageId))
      .unique();
    if (duplicate) return { gaps: [] };
    let extracted = args.extracted;
    const diet = event.dietary === "nonveg" ? "nonveg" : "veg";
    if (extracted.reply_kind === "auto_reply") {
      await ctx.db.patch(message._id, {extractionStatus:"complete", extractionError:undefined});
      return {gaps:[]};
    }

    // Retire the previous quote rather than overwriting it. A vendor who
    // revises a price mid-thread is worth being able to show.
    const prior = await ctx.db
      .query("quotes")
      .withIndex("by_vendor_live", (q) =>
        q.eq("vendorId", message.vendorId).eq("supersededAt", null),
      )
      .take(20);
    let sourceMessageIds = [message._id];
    const previous = prior[0];
    if (previous) {
      const sent = await ctx.db.query("messages").withIndex("by_vendor",q=>q.eq("vendorId", message.vendorId)).order("desc").take(20);
      const followup = sent.find(m => m.direction === "out" && m.askedAbout.length > 0 && m.receivedAt < message.receivedAt);
      const merged = mergeTerms(previous, extracted, followup?.askedAbout ?? []);
      if (merged) { extracted = merged; sourceMessageIds = [...(previous.sourceMessageIds ?? [previous.messageId]), message._id]; }
    }
    if (previous && extracted.reply_kind === "no_price") {
      await ctx.db.patch(message._id, {extractionStatus:"complete", extractionError:undefined});
      return {gaps:[]};
    }
    const norm = normalise(extracted, event.headcount, diet);
    for (const p of prior) {
      const priorMessage = await ctx.db.get(p.messageId);
      if (priorMessage && priorMessage.receivedAt > message.receivedAt) {
        await ctx.db.patch(message._id, {
          extractionStatus: "complete",
          extractionError: undefined,
        });
        return { gaps: [] };
      }
      await ctx.db.patch(p._id, { supersededAt: Date.now() });
    }

    await ctx.db.insert("quotes", {
      vendorId: message.vendorId,
      eventId: message.eventId,
      messageId: args.messageId,
      ...extracted,
      sourceMessageIds,
      normalisedTotal: norm.total,
      isPreTax: norm.isPreTax,
      blocker: norm.blocker,
      notes: norm.notes,
      pricingFlag: args.pricingFlag,
      supersededAt: null,
    });

    const gaps = gapsWorthAsking(extracted);
    await ctx.db.patch(message._id, {
      extractionStatus: "complete",
      extractionError: undefined,
    });
    if (extracted.reply_kind === "declined")
      await ctx.db.patch(message.vendorId, { status: "declined" });
    else if (gaps.length === 0 && norm.total !== null && !norm.blocker) {
      await ctx.db.patch(message.vendorId, { status: "complete" });
    }
    const vendor = await ctx.db.get(message.vendorId);
    if (vendor?.autoFollowup && !vendor.followupState && vendor.threadId
        && extracted.reply_kind === "quote" && gaps.length > 0
        && !/^(manual:|qa-webhook:|fixture-)/.test(message.agentmailMessageId)) {
      await ctx.db.patch(vendor._id, {followupState:"queued"});
      await ctx.scheduler.runAfter(15000, internal.outbound.askAboutGaps, {vendorId:vendor._id, messageId:message._id, gaps});
    }
    return { gaps };
  },
});
