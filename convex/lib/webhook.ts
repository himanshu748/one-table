import { Webhook } from "svix";
export function verifiedWebhookPayload(
  secret: string,
  body: string,
  headers: Record<string, string>,
): unknown {
  // Current Svix verifies the signature but intentionally returns undefined.
  new Webhook(secret).verify(body, headers);
  return JSON.parse(body);
}
