# One Table

Compare venue quotes at your actual guest count, with original replies and visible pricing gaps.

[Open the public pilot](https://wooden-dogfish-387.convex.site). The frontend is hosted on Convex; it currently uses the dedicated cloud development deployment. The public Vibe Apps listing is at https://vibeapps.dev/s/one-table. Dedicated event inclusion and Luma registration still need confirmation.

## What works

- A clearly labelled fictional example board, separate from private event data.
- Convex Auth email-code sign-in, cross-device access, private events, venue contacts and saved original replies. Existing guest workspaces transfer after email verification.
- A two-step event brief with neighbourhood, flexible dates, private budget and must-haves; saved shortlists and reviewed batch enquiries.
- Quote revision history with original messages and document links.
- Firecrawl contact discovery with source links; returned contacts are unverified leads for buyer review.
- OpenAI extraction via the existing Vercel AI Gateway configuration, pinned to OpenAI. Provider errors stay visible; there is no silent model fallback.
- Deterministic quote arithmetic, vegetarian/non-vegetarian selection, responsive comparison and CSV export.
- Duplicate extraction protection and protection against an older reply replacing a newer quote.
- Reviewed enquiries for verified accounts, with Convex rate limits. Discovery never sends enquiries.

Unknown tax, inadequate package capacity, absent menu rates and price ranges do not rank as confirmed comparable totals. Published starting prices are not accusations of overcharging.

## Current integration boundary

A dedicated AgentMail inbox and inbox-scoped API key are configured in Convex. A live controlled test completed the full loop between two owned inboxes: approved enquiry, received quote, opted-in automatic clarification, received tax answer, and a reactive ₹177,000 total for 120 guests at ₹1,250 plus 18% GST. No real venues were contacted.

Automatic clarification is optional, limited to one per venue, and covers missing tax, minimum-cover and confirmation terms only. It never books or negotiates. A queued send is claimed once; uncertain delivery is not retried automatically. Verified accounts can approve enquiries to ordinary venue contacts when PUBLIC_SENDING_ENABLED is true.


The latest OpenAI fixture run completed five cases before persistent gateway rate limits stopped the run: **64/65 scored fields, 35/35 blank-when-unstated checks, and 5/5 totals**. The complete twelve-fixture gate has **not** passed. One tax-inclusion field was missed. This partial run preceded the document-classification prompt refinement; the full final-prompt gate remains open. `experiments/extraction/results-openai.json` is partial evidence. The example board preserves Claude's historical fixture results and says so.

PDF, PNG and JPEG quotes can now be uploaded manually (4 MiB maximum), stored privately and extracted by OpenAI. Controlled PDF and PNG tests both calculated INR 141,600 for 80 guests at INR 1,500 plus 18% GST. Firecrawl published-pricing extraction and automatic inbound email attachment ingestion remain unfinished. Answers to requested clarification terms can complete a prior quote while retaining source-message IDs. New pricing and declines do not use that merge. Review the original thread before booking. Do not call this an autonomous procurement agent.

## Develop

```sh
npm ci
npx convex dev --configure new --dev-deployment cloud
npx @convex-dev/auth --skip-git-check --web-server-url http://localhost:5190
npm run dev:web -- --host 127.0.0.1 --port 5190
```

For the existing project, use `npx convex dev --once`. It reads ignored `.env.local`. Configure provider secrets on the Convex backend, never in `VITE_` variables. See `.env.example` for names.

```sh
npm test
npm run build
node scripts/run-openai-gate.mjs
```

The extraction experiment imports the same prompt and arithmetic as the deployed implementation. Live gate requests are sequential and stop after a persistent rate limit. The local unit/Convex tests do not call any provider.

## Hosting

```sh
npx convex dev --once
npx @convex-dev/static-hosting upload --build --dev
```

`npm run deploy:pilot` updates the current public pilot. `npm run deploy` targets production. Production needs its own auth keys, provider settings and webhook URL; development credentials do not carry over automatically.

## Privacy and pilot limits

Email-code sign-in provides cross-device access. Existing guests should verify their email in their original browser before clearing its storage. Each session can create ten events per day, each event holds up to ten contacts, and pasted replies are bounded. Original reply text is sent to OpenAI for extraction and stored in private Convex records. Source discovery sends the city, neighbourhood, occasion, guest count and selected needs to Firecrawl. The optional budget stays private and is used only for comparison. Uploaded documents are sent to OpenAI; uploads are limited to ten per account per day.

Live enquiries require a verified account and buyer approval. The public trial permits three contacted venues per event and five enquiries per account per day. `PILOT_RECIPIENTS` is retained only for controlled guest testing. `PUBLIC_SENDING_ENABLED=false` pauses ordinary public sending. A failed send is marked uncertain rather than automatically retried. Sender and inbox must match the recorded vendor thread for inbound processing. Alternate sales addresses and large/attachment-only emails need manual review.

Built for the [Convex All Gas Hackathon](https://www.convex.dev/hackathons/all-gas). See `hackathon.md` for evidence and remaining submission gates.

## Public entry points

- `/`: landing page with an interactive, explicitly fictional comparison preview.
- `/#demo`: mock quote comparison and mock source replies; no email or event writes.
- `/#workspace`: the real private event workspace. Paste actual replies or upload PDF/images to extract quotes; verify your email to approve limited live enquiries.

## Public trial resource limits

The registered `@convex-dev/rate-limiter` component enforces transactional limits: five searches and twenty extraction attempts per account per day; globally, one hundred searches, two hundred extractions, and one hundred enquiry/clarification sends per day. Sign-in delivery has a separate one-hundred-email daily cap, three requests per address per hour, and a one-minute cooldown. These are request ceilings, not a guaranteed currency-denominated provider budget. Sign-in codes expire after ten minutes and Convex Auth limits failed verification attempts. API keys remain backend-only.
