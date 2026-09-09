import { execFileSync } from "node:child_process";
const get = (n) =>
  execFileSync("npx", ["convex", "env", "get", n], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
const set = (n, v) =>
  execFileSync("npx", ["convex", "env", "set", n], {
    input: v,
    stdio: ["pipe", "pipe", "pipe"],
  });
const key = get("AGENTMAIL_API_KEY");
async function request(path, body) {
  const r = await fetch("https://api.agentmail.to/v0" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) {
    console.log("AgentMail status", r.status, "on", path);
    process.exit(1);
  }
  return r.json();
}
const inboxId = get("AGENTMAIL_INBOX_ID");
const base = "/inboxes/" + encodeURIComponent(inboxId) + "/webhooks";
const origin = process.env.WEBHOOK_ORIGIN;
if (!origin)
  throw new Error("Set WEBHOOK_ORIGIN to your public Convex HTTP origin.");
const url = new URL("/agentmail/inbound", origin).href;
if (new URL(url).protocol !== "https:")
  throw new Error("Webhook origin must use HTTPS.");
const hooks = await request(base);
let hook = hooks.webhooks?.find((h) => h.url === url);
if (!hook)
  hook = await request(base, {
    url,
    event_types: ["message.received"],
    client_id: "one-table-inbound-v1",
  });
if (!hook.secret)
  hook = await request(base + "/" + encodeURIComponent(hook.webhook_id));
if (!hook.secret)
  throw new Error(
    "Webhook secret not available; finish configuration in provider console.",
  );
set("AGENTMAIL_WEBHOOK_SECRET", hook.secret);
console.log("Dedicated One Table inbox configured:", inboxId);
console.log("Webhook configured:", url);
console.log("No email sent.");
