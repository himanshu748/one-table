import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
export const current = query({
  args:{}, returns:v.object({email:v.union(v.string(),v.null()), verified:v.boolean(), publicSending:v.boolean()}),
  handler:async ctx=>{
    const id = await getAuthUserId(ctx);
    const user = id ? await ctx.db.get(id) : null;
    return {email:user?.email ?? null, verified:!!user?.emailVerificationTime && !user?.isAnonymous, publicSending:process.env.PUBLIC_SENDING_ENABLED === "true"};
  },
});
