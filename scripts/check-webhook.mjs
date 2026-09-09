// Controlled signed transport check, distinct from provider-delivered email.
import { execFileSync } from "node:child_process";
import { Webhook } from "svix";
const get = (name) =>
  execFileSync("npx", ["convex", "env", "get", name], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const required = (name) => {
  const value = process.env[name];
  if (!value)
    throw new Error(`Set ${name} explicitly for an owned test event.`);
  return value;
};
const origin = required("WEBHOOK_ORIGIN");
const threadId = required("QA_THREAD_ID");
const sender = required("QA_SENDER");
const inboxId = get("AGENTMAIL_INBOX_ID");
const secret = get("AGENTMAIL_WEBHOOK_SECRET");
const id = "qa-webhook:" + crypto.randomUUID();
const timestamp = new Date();
const payload = JSON.stringify({
  event_type: "message.received",
  message: {
    message_id: id,
    thread_id: threadId,
    inbox_id: inboxId,
    from: sender,
    subject: "Signed webhook QA fixture — not provider delivery",
    text: "CONTROLLED FICTIONAL WEBHOOK TEST. Vegetarian rate INR 1250 per guest including all taxes. Minimum guarantee 100 guests. Confirm 10 days before the event. This is not a real venue offer.",
    timestamp: timestamp.toISOString(),
  },
});
const url = new URL("/agentmail/inbound", origin).href;
if (new URL(url).protocol !== "https:")
  throw new Error("Webhook origin must use HTTPS.");
const unsigned = await fetch(url, { method: "POST", body: payload });
if (unsigned.status !== 401)
  throw new Error("Unsigned request was not rejected");
const headers = {
  "content-type": "application/json",
  "svix-id": id,
  "svix-timestamp": String(Math.floor(timestamp.getTime() / 1000)),
  "svix-signature": new Webhook(secret).sign(id, timestamp, payload),
};
for (let i = 0; i < 2; i++) {
  const r = await fetch(url, { method: "POST", headers, body: payload });
  if (r.status !== 200) throw new Error("Signed request status " + r.status);
}
console.log(
  "Unsigned request rejected; signed fixture and duplicate accepted. Synthetic message ID:",
  id,
);
