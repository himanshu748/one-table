import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
export async function canSend(
  ctx: Pick<QueryCtx, "db">,
  userId: Id<"users">,
  email: string,
) {
  const pilot = (process.env.PILOT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase());
  if (pilot.includes(email.toLowerCase())) return true;
  if (process.env.PUBLIC_SENDING_ENABLED !== "true") return false;
  const user = await ctx.db.get(userId);
  return (
    !!user?.email &&
    typeof user.emailVerificationTime === "number" &&
    !user.isAnonymous
  );
}
