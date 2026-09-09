"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { discoveryQuery } from "./lib/brief";
export const findVendors = internalAction({
  args: { eventId: v.id("events") },
  returns: v.null(),
  handler: async (ctx, { eventId }) => {
    try {
      const event = await ctx.runQuery(internal.discoveryData.context, {
        eventId,
      });
      if (!event) return null;
      const response = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        signal: AbortSignal.timeout(90000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
        },
        body: JSON.stringify({
          query: discoveryQuery(event),
          limit: 5,
          scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
        }),
      });
      if (!response.ok)
        throw new Error(
          `Venue search returned HTTP ${response.status}. Try again later.`,
        );
      const data = await response.json();
      const pages = Array.isArray(data.data)
        ? data.data
        : (data.data?.web ?? []);
      const vendors = [];
      for (const page of pages) {
        if (!page.url || !page.markdown) continue;
        let url: URL;
        try {
          url = new URL(page.url);
        } catch {
          continue;
        }
        if (url.protocol !== "https:") continue;
        const emails = [
          ...new Set<string>(
            (page.markdown as string).match(
              /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
            ) ?? [],
          ),
        ].filter((e) => !/\.(png|jpg|webp|svg)$/i.test(e));
        // Contacts are source leads requiring human review, not verified venue identities.
        if (!emails.length) continue;
        vendors.push({
          name: String(page.title ?? url.hostname).slice(0, 120),
          email: emails[0].toLowerCase(),
          sourceUrl: url.href,
          discoveryExcerpt: String(page.description || page.markdown).replace(/[#*\[\]]/g, "").slice(0,500),
        });
      }
      await ctx.runMutation(internal.discoveryData.finish, {
        eventId,
        vendors,
        error: vendors.length
          ? null
          : "No usable email contacts found on these five pages. Add a venue manually or retry with a more specific city.",
      });
    } catch (error) {
      await ctx.runMutation(internal.discoveryData.finish, {
        eventId,
        vendors: [],
        error:
          error instanceof Error &&
          error.message.startsWith("Venue search returned")
            ? error.message
            : "Venue search failed. Try again or add a venue manually.",
      });
    }
    return null;
  },
});
