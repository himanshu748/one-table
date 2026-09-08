import { RateLimiter, DAY, HOUR, MINUTE } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
export const limits = new RateLimiter(components.rateLimiter, {
  authEmail: { kind: "token bucket", rate: 3, period: HOUR, capacity: 3 },
  authCooldown: { kind: "token bucket", rate: 1, period: MINUTE, capacity: 1 },
  authGlobal: { kind: "fixed window", rate: 100, period: DAY },
  enquiries: { kind: "fixed window", rate: 5, period: DAY },
  mailGlobal: { kind: "fixed window", rate: 100, period: DAY },
  recipient: { kind: "fixed window", rate: 3, period: DAY },
  searches: { kind: "fixed window", rate: 5, period: DAY },
  searchGlobal: { kind: "fixed window", rate: 100, period: DAY },
  extraction: { kind: "fixed window", rate: 20, period: DAY },
  extractionGlobal: { kind: "fixed window", rate: 200, period: DAY },
});
export const reserveAuthEmail = internalMutation({
  args: { email: v.string() }, returns: v.null(),
  handler: async (ctx, { email }) => {
    if (!/^[^\s@<>;,]+@[^\s@<>;,]+\.[^\s@<>;,]+$/.test(email) || email.length > 254)
      throw new ConvexError("Enter a valid email address.");
    for (const name of ["authCooldown", "authEmail", "authGlobal"] as const) {
      const result = await limits.limit(ctx, name, name === "authGlobal" ? {} : {key: email});
      if (!result.ok) throw new ConvexError("Too many sign-in requests. Please try again later.");
    }
    return null;
  },
});
export const reserveExtraction = internalMutation({
  args: { messageId: v.id("messages") }, returns: v.null(),
  handler: async (ctx, {messageId}) => {
    const message = await ctx.db.get(messageId);
    const event = message && await ctx.db.get(message.eventId);
    if (!event) throw new ConvexError("Event unavailable.");
    await limits.limit(ctx, "extraction", {key:event.userId, throws:true});
    await limits.limit(ctx, "extractionGlobal", {throws:true});
    return null;
  },
});
