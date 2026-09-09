"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Shipping prompt and schema are shared with the extraction experiment.
// Latest provider gate is partial; see hackathon.md for measured evidence.
import { EXTRACT_SCHEMA, EXTRACT_SYSTEM } from "./lib/extractionContract";

export const fromMessage = internalAction({
  args: { agentmailMessageId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const key = process.env.OPENAI_API_KEY ?? process.env.AI_GATEWAY_API_KEY;
      if (!key)
        throw new Error("OPENAI_API_KEY is not set on the Convex deployment");

      const ctxData = await ctx.runQuery(internal.messages.forExtraction, {
        agentmailMessageId: args.agentmailMessageId,
      });
      if (!ctxData) return null;

      await ctx.runMutation(internal.limits.reserveExtraction, {messageId:ctxData.messageId});
      const content: Array<unknown> = [{type:"text",text:`Buyer asked for a quote for ${ctxData.headcount} guests on ${ctxData.eventDate}.\n\nSubject: ${ctxData.subject}\n\n${ctxData.body}`}];
      for (const id of ctxData.attachmentIds.slice(0,1)) {
        const blob = await ctx.storage.get(id);
        if (!blob || blob.size > 4*1024*1024) throw new Error("Attachment unavailable");
        const data = `data:${blob.type};base64,${Buffer.from(await blob.arrayBuffer()).toString("base64")}`;
        content.push(blob.type === "application/pdf" ? {type:"file",file:{filename:"quote.pdf",file_data:data}} : {type:"image_url",image_url:{url:data}});
      }
      const r = await fetch(
        process.env.OPENAI_API_KEY
          ? "https://api.openai.com/v1/chat/completions"
          : "https://ai-gateway.vercel.sh/v1/chat/completions",
        {
          signal: AbortSignal.timeout(60000),
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_API_KEY ? "gpt-4.1" : "openai/gpt-4.1",
            ...(!process.env.OPENAI_API_KEY
              ? { providerOptions: { gateway: { only: ["openai"] } } }
              : {}),
            messages: [
              { role: "system", content: EXTRACT_SYSTEM },
              {
                role: "user",
                content,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "quote",
                strict: true,
                schema: EXTRACT_SCHEMA,
              },
            },
          }),
        },
      );
      if (!r.ok)
        throw new Error(
          `OpenAI returned HTTP ${r.status}. Retry when the provider is available.`,
        );
      const extracted = JSON.parse((await r.json()).choices[0].message.content);

      // Firecrawl cross-check: does the quote exceed what the vendor advertises
      // publicly? Only meaningful when we scraped a price during discovery.
      let pricingFlag: string | null = null;
      const published = ctxData.publishedPerHead;
      if (
        published !== null &&
        extracted.per_head_veg !== null &&
        extracted.per_head_veg > published
      ) {
        pricingFlag = `Published starting rate ${published}; quoted ${extracted.per_head_veg}. Check date, menu and inclusions before comparing.`;
      }

      await ctx.runMutation(internal.inbound.saveQuote, {
        messageId: ctxData.messageId,
        extracted,
        pricingFlag,
      });

      return null;
    } catch (error) {
      await ctx.runMutation(internal.messages.failed, {
        agentmailMessageId: args.agentmailMessageId,
        error:
          error instanceof Error && error.message.startsWith("OpenAI returned")
            ? error.message
            : "Quote extraction failed. Your original reply is saved; retry extraction.",
      });
      return null;
    }
  },
});
