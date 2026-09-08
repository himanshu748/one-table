import { v } from "convex/values";
import { internalAction } from "./_generated/server";
// Silent vendors are surfaced for buyer review. A timer never grants permission to email.
export const sweep = internalAction({
  args: { silentForHours: v.number(), maxNudges: v.number() },
  returns: v.null(),
  handler: async () => null,
});
