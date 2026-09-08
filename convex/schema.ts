import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

// A field is null when the vendor never stated it. That is different from zero
// and different from "not applicable", and the whole comparison depends on
// keeping the three apart. Anything null and material becomes a follow-up.
export const quoteFields = {
  reply_kind: v.union(
    v.literal("quote"),
    v.literal("declined"),
    v.literal("auto_reply"),
    v.literal("no_price"),
  ),
  vendor_name: v.union(v.string(), v.null()),
  pricing_model: v.union(
    v.literal("per_head"),
    v.literal("package"),
    v.literal("hall_plus_fnb"),
    v.literal("unknown"),
  ),
  per_head_veg: v.union(v.number(), v.null()),
  per_head_nonveg: v.union(v.number(), v.null()),
  package_total: v.union(v.number(), v.null()),
  package_covers: v.union(v.number(), v.null()),
  hall_rent: v.union(v.number(), v.null()),
  fnb_minimum: v.union(v.number(), v.null()),
  min_guarantee_covers: v.union(v.number(), v.null()),
  taxes_included: v.union(v.boolean(), v.null()),
  tax_percent: v.union(v.number(), v.null()),
  lead_time_days: v.union(v.number(), v.null()),
  inclusions: v.array(v.string()),
  exclusions: v.array(v.string()),
  unstated: v.array(v.string()),
};

export default defineSchema({
  ...authTables,
  events: defineTable({
    userId: v.id("users"),
    discoveryStatus: v.optional(v.string()),
    discoveryError: v.optional(v.string()),
    title: v.string(),
    city: v.string(),
    eventDate: v.string(),
    headcount: v.number(),
    dietary: v.union(v.literal("veg"), v.literal("nonveg"), v.literal("both")),
    needs: v.array(v.string()),
    budgetHint: v.union(v.number(), v.null()),
    agentInboxId: v.union(v.string(), v.null()),
  }).index("by_user", ["userId"]),

  // One row per vendor we found or the buyer pasted in.
  vendors: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    email: v.string(),
    sourceUrl: v.union(v.string(), v.null()),
    // Firecrawl's read of the vendor's own published pricing, used later to
    // flag a quote that exceeds what they advertise publicly.
    publishedPricing: v.union(
      v.object({
        perHeadFrom: v.union(v.number(), v.null()),
        packagesFrom: v.union(v.number(), v.null()),
        capacity: v.union(v.number(), v.null()),
        scrapedAt: v.number(),
        sourceUrl: v.string(),
      }),
      v.null(),
    ),
    threadId: v.union(v.string(), v.null()),
    status: v.union(
      v.literal("discovered"),
      v.literal("rfq_sent"),
      v.literal("replied"),
      v.literal("followup_sent"),
      v.literal("complete"),
      v.literal("bounced"),
      v.literal("declined"),
    ),
    lastOutboundAt: v.union(v.number(), v.null()),
    lastInboundAt: v.union(v.number(), v.null()),
    nudgeCount: v.number(),
    error: v.optional(v.string()),
    outboundState: v.optional(v.string()),
    autoFollowup: v.optional(v.boolean()),
    followupState: v.optional(v.string()),
    followupError: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_thread", ["threadId"])
    .index("by_event_status", ["eventId", "status"]),

  // Raw inbound and outbound email, kept verbatim so a quote can always be
  // traced back to the sentence it came from.
  messages: defineTable({
    vendorId: v.id("vendors"),
    eventId: v.id("events"),
    direction: v.union(v.literal("in"), v.literal("out")),
    agentmailMessageId: v.string(),
    subject: v.string(),
    body: v.string(),
    replyText: v.optional(v.string()),
    attachmentIds: v.array(v.id("_storage")),
    receivedAt: v.number(),
    // Set when this outbound message was an automatic gap-filling follow-up,
    // naming the fields it asked about.
    askedAbout: v.array(v.string()),
    extractionStatus: v.optional(v.string()),
    extractionError: v.optional(v.string()),
  })
    .index("by_vendor", ["vendorId"])
    .index("by_event", ["eventId"])
    .index("by_agentmail_id", ["agentmailMessageId"]),

  // The extracted quote. Latest per vendor wins, older ones stay for history.
  quotes: defineTable({
    vendorId: v.id("vendors"),
    eventId: v.id("events"),
    messageId: v.id("messages"),
    ...quoteFields,
    sourceMessageIds: v.optional(v.array(v.id("messages"))),
    // Computed by lib/normalise, never by the model.
    normalisedTotal: v.union(v.number(), v.null()),
    isPreTax: v.boolean(),
    blocker: v.union(v.string(), v.null()),
    notes: v.array(v.string()),
    // "their site says 1450, they quoted 1700"
    pricingFlag: v.union(v.string(), v.null()),
    supersededAt: v.union(v.number(), v.null()),
  })
    .index("by_event", ["eventId"])
    .index("by_vendor", ["vendorId"])
    .index("by_message", ["messageId"])
    .index("by_vendor_live", ["vendorId", "supersededAt"])
    .index("by_event_live", ["eventId", "supersededAt"]),
});
