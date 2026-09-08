import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, components } from "./_generated/api";
import { auth } from "./auth";
import { verifiedWebhookPayload } from "./lib/webhook";
import { registerStaticRoutes } from "@convex-dev/static-hosting";
const http = httpRouter();
auth.addHttpRoutes(http);
http.route({
  path: "/agentmail/inbound",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.AGENTMAIL_WEBHOOK_SECRET;
    if (!secret) return new Response("Not configured", { status: 503 });
    const body = await request.text();
    if (body.length > 1000000)
      return new Response("Payload too large", { status: 413 });
    let payload: unknown;
    try {
      payload = verifiedWebhookPayload(secret, body, {
        "svix-id": request.headers.get("svix-id") ?? "",
        "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
        "svix-signature": request.headers.get("svix-signature") ?? "",
      });
    } catch {
      return new Response("Invalid signature", { status: 401 });
    }
    const p = payload as {
      event_type?: string;
      message?: Record<string, unknown>;
    };
    if (!p || typeof p !== "object")
      return new Response("Invalid event", { status: 400 });
    if (p.event_type !== "message.received")
      return new Response("Ignored", { status: 200 });
    const m = p.message;
    if (
      !m ||
      ![m.message_id, m.thread_id, m.inbox_id, m.from].every(
        (x) => typeof x === "string",
      )
    )
      return new Response("Invalid event", { status: 400 });
    await ctx.runMutation(internal.inbound.recordReply, {
      agentmailMessageId: m.message_id as string,
      threadId: m.thread_id as string,
      inboxId: m.inbox_id as string,
      from: m.from as string,
      subject: typeof m.subject === "string" ? m.subject : "",
      replyText: typeof m.extracted_text === "string" && m.extracted_text.trim() ? m.extracted_text : undefined,
      body:
        typeof m.text === "string"
          ? m.text
          : "[Email contains no plain-text body. Review attachments in the inbox.]",
      receivedAt:
        typeof m.timestamp === "string" &&
        Number.isFinite(Date.parse(m.timestamp))
          ? Date.parse(m.timestamp)
          : Date.now(),
    });
    return new Response("ok", { status: 200 });
  }),
});
registerStaticRoutes(http, components.selfHosting);
export default http;
