import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
export async function ownedEvent(
  ctx: QueryCtx | MutationCtx,
  id: Id<"events">,
) {
  const user = await getAuthUserId(ctx);
  const event = await ctx.db.get(id);
  if (!user || !event || event.userId !== user)
    throw new ConvexError("This event is not available to your session.");
  return event;
}
