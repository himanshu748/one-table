# Integration handoff, updated September 9, 2026

Claude's original work is preserved. Codex completed the previously missing transport functions and connected a real private workspace. See README.md for current evidence; the original claim that a VITE_CONVEX_URL automatically switched the fixture board to live subscriptions was incorrect and is now fixed.

## Deployment

- Project: one-table
- Cloud development deployment: wooden-dogfish-387
- Public pilot: https://wooden-dogfish-387.convex.site
- Auth: Convex Auth email codes plus legacy guests; backend signing keys configured. Verification moves the current guest workspace into the verified account.
- Firecrawl, AI Gateway and a dedicated inbox-scoped AgentMail key configured without printing secrets. RentPilot deployment and credentials were not modified.

## Email configuration

Inbox: `one-table-himanshu@agentmail.to`. The dedicated key has nine permissions covering send/read mail and webhook creation/read, restricted to this inbox. `AGENTMAIL_INBOX_ID` and the inbox-specific `AGENTMAIL_WEBHOOK_SECRET` are configured. The endpoint is `https://wooden-dogfish-387.convex.site/agentmail/inbound`.

`scripts/configure-inbox.mjs` idempotently configures the scoped webhook using backend credentials without printing them. `PILOT_RECIPIENTS` is unset on the public deployment. `PUBLIC_SENDING_ENABLED=true` enables limited sending for verified accounts; no recipient invitation is needed. The real provider-delivered four-message enquiry/quote/clarification/answer loop succeeded; evidence is recorded in `hackathon.md`. The earlier mail-only key remains in AgentMail but is no longer used by this backend.

## Product gaps

- Full OpenAI regression blocked by persistent gateway free-tier 429. Five of twelve fixtures completed: 64/65 fields, 35/35 unstated checks, 5/5 totals; do not report a full pass.
- Firecrawl currently discovers contact leads; published pricing extraction remains absent.
- Term-only answers to requested clarifications merge into the prior quote with source IDs. Broad negotiation and arbitrary revision merging are intentionally unsupported.
- Inbound alternate sales senders and automatic email attachments need manual review. Manual PDF/PNG/JPEG upload and extraction are supported.
- Sending needs verified email and buyer approval, with three contacted venues per event and five enquiries per account per day. An opted-in, once-per-venue clarification runs after a quote; no timer reminders run.
- Independent human playtest and Luma registration confirmation remain outstanding. Sponsor-tagged X launch is published and linked from the submission. Public source and walkthrough are on GitHub; Vibe Apps submission is verified at https://vibeapps.dev/s/one-table.

## Verification

`npm test` covers arithmetic and private/duplicate/stale-quote behavior. `npm run build` covers frontend and backend types. Provider/browser evidence belongs in `hackathon.md`; these are distinct from unit tests.
