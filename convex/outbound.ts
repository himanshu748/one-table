"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

import { enquiryText } from "./lib/brief";

const AGENTMAIL = "https://api.agentmail.to/v0";

// One question per missing field, phrased the way a buyer would actually ask.
// Short and specific gets answered; a checklist does not.
const QUESTION: Record<string, string> = {
  taxes_included:
    "Is the rate inclusive of GST? If tax is extra, what percentage applies?",
  tax_percent: "What rate is GST applied at on the quoted amount?",
  lead_time_days:
    "How far in advance do you need confirmation to hold the date?",
  min_guarantee_covers:
    "Is there a minimum guaranteed cover count on that rate?",
};

async function agentmail(path: string, body: unknown) {
  const key = process.env.AGENTMAIL_API_KEY;
  if (!key)
    throw new Error("AGENTMAIL_API_KEY is not set on the Convex deployment");
  const r = await fetch(`${AGENTMAIL}${path}`, {
    signal: AbortSignal.timeout(30000),
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok)
    throw new Error(`AgentMail ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r.json();
}

// The demo moment. A vendor answered but left out something material, so we
// reply inside their own thread asking only about that, and the grey cell on
// the board fills in when they answer.
export const askAboutGaps = internalAction({
  args: { vendorId: v.id("vendors"), messageId: v.id("messages"), gaps: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (!(await ctx.runMutation(internal.vendors.claimFollowup, {vendorId: args.vendorId, messageId: args.messageId}))) return null;
    try {
    const vendor = await ctx.runQuery(internal.vendors.forOutbound, {
      vendorId: args.vendorId,
    });
    if (!vendor || vendor.threadId === null || !vendor.lastMessageId)
      throw new Error("No incoming message available for reply");

    // Never chase the same field twice. A vendor who ignored the question once
    // is not going to answer it because we asked again.
    const fresh = args.gaps.filter((g) => !vendor.alreadyAsked.includes(g));
    if (fresh.length === 0) return null;

    const questions = fresh.map((g) => QUESTION[g]).filter(Boolean);
    if (questions.length === 0) return null;

    const text =
      `Thanks for the quote.\n\n` +
      questions.map((q) => `- ${q}`).join("\n") +
      `\n\nOnce I have that I can put your quote in front of the family alongside the others.`;

    if (!vendor.inboxId || !vendor.sendingAllowed)
      throw new Error("Recipient is not enabled for the controlled pilot.");
    const sent = await agentmail(
      `/inboxes/${encodeURIComponent(vendor.inboxId!)}/messages/${encodeURIComponent(vendor.lastMessageId)}/reply`,
      { text },
    );

    await ctx.runMutation(internal.vendors.recordOutbound, {
      vendorId: args.vendorId,
      agentmailMessageId: sent.message_id,
      subject: `Re: ${vendor.lastSubject}`,
      body: text,
      askedAbout: fresh,
      status: "followup_sent",
    });
    } catch {
      await ctx.runMutation(internal.vendors.followupFailed, {vendorId: args.vendorId});
    }
    return null;
  },
});

// Opening RFQ. Referencing the vendor's own published capacity is what keeps
// this out of the spam folder: it reads as a buyer who looked at their site.
export const sendRfq = internalAction({
  args: { vendorId: v.id("vendors") },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (
      !(await ctx.runMutation(internal.vendors.claimSend, {
        vendorId: args.vendorId,
      }))
    )
      return null;
    try {
      const vendor = await ctx.runQuery(internal.vendors.forOutbound, {
        vendorId: args.vendorId,
      });
      if (!vendor) return null;

      const e = vendor.event;
      const text = enquiryText(e);

      if (!vendor.inboxId || !vendor.sendingAllowed)
        throw new Error("Recipient is not enabled for the controlled pilot.");
      const sent = await agentmail(
        `/inboxes/${encodeURIComponent(vendor.inboxId!)}/messages/send`,
        {
          to: [vendor.email],
          subject: `${e.title} for ${e.headcount} guests, ${e.city}, ${e.eventDate}`,
          text,
        },
      );

      await ctx.runMutation(internal.vendors.recordOutbound, {
        vendorId: args.vendorId,
        agentmailMessageId: sent.message_id,
        threadId: sent.thread_id,
        subject: `${e.title} for ${e.headcount} guests`,
        body: text,
        askedAbout: [],
        status: "rfq_sent",
      });
    } catch {
      await ctx.runMutation(internal.vendors.sendFailed, {
        vendorId: args.vendorId,
      });
    }
    return null;
  },
});
