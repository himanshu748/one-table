import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { Email } from "@convex-dev/auth/providers/Email";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
const EmailCode = Email({
  id: "email-code",
  maxAge: 60 * 10,
  generateVerificationToken: async () => {
    let value: number;
    do {
      value = crypto.getRandomValues(new Uint32Array(1))[0];
    } while (value >= 4200000000);
    return String(value % 100000000).padStart(8, "0");
  },
  async sendVerificationRequest({ identifier, token }, ctx?: ActionCtx) {
    if (!ctx) throw new Error("Sign-in context unavailable.");
    const siteUrl = process.env.SITE_URL;
    if (!siteUrl) throw new Error("SITE_URL must be configured for sign-in.");
    const signInUrl = new URL("/#workspace", siteUrl).href;
    const email = identifier.trim().toLowerCase();
    await ctx.runMutation(internal.limits.reserveAuthEmail, { email });
    const inbox = process.env.AGENTMAIL_INBOX_ID;
    const key = process.env.AGENTMAIL_API_KEY;
    if (!inbox || !key) throw new Error("Email sign-in is unavailable.");
    const result = await fetch(
      `https://api.agentmail.to/v0/inboxes/${encodeURIComponent(inbox)}/messages/send`,
      {
        method: "POST",
        signal: AbortSignal.timeout(30000),
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          to: [email],
          subject: "Your One Table sign-in code",
          text: `Your One Table sign-in code is:\n\n${token}\n\nEnter it only at ${signInUrl}. It expires in 10 minutes. Never share this code. If you did not request it, ignore this email.`,
        }),
      },
    );
    if (!result.ok)
      throw new Error(
        "We could not deliver the sign-in email. Please try again later.",
      );
  },
});
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Anonymous, EmailCode],
  callbacks: {
    afterUserCreatedOrUpdated: async (authCtx, args) => {
      const ctx = authCtx as MutationCtx;
      if (args.type !== "verification" || !args.profile.emailVerified) return;
      const guestId = await getAuthUserId(ctx);
      if (!guestId || guestId === args.userId) return;
      const guest = await ctx.db.get(guestId);
      if (!guest?.isAnonymous) return;
      const events = await ctx.db
        .query("events")
        .withIndex("by_user", (q) => q.eq("userId", guestId))
        .take(1000);
      for (const event of events)
        await ctx.db.patch(event._id, { userId: args.userId });
    },
  },
});
