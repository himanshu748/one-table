# One Table: Convex All Gas build record

Updated September 9, 2026.

- [Live app](https://wooden-dogfish-387.convex.site/)
- [Public repository](https://github.com/himanshu748/one-table)
- [Submitted Vibe Apps listing](https://vibeapps.dev/s/one-table)
- [Playable walkthrough](https://drive.google.com/file/d/19CIu9tWAfKNo1nFfHzACgcnQIv-oUi_C/view)
- [Sponsor-tagged X launch](https://x.com/jhahimanshu653/status/2097279039463694526)

## What people can do

Plan a gathering, discover venue contacts, approve enquiries and compare returned quotes at a common guest count. The brief captures city, neighbourhood, date flexibility, menu and must-haves. An optional budget stays private. Buyers can upload PDF, PNG or JPEG quotes, review original documents and see earlier quote versions. A separate fictional example is available without sign-in.

## Stack and real work

| Technology | Implemented responsibility |
| --- | --- |
| Convex | Email-code auth, owner-scoped queries and mutations, event/message/quote records, document storage, scheduled actions and reactive updates |
| Convex components | Transactional rate limiting and static hosting |
| Firecrawl | Venue contact discovery from the event brief, with source links and excerpts; contacts remain unverified leads |
| OpenAI | Structured extraction of quoted terms from text and manually uploaded PDFs/images, through the configured AI Gateway |
| AgentMail | Sign-in codes, approved enquiries, signed inbound webhook and one optional missing-term clarification per venue |

Claude created the original extraction experiment and comparison interface. Codex completed the backend, provider integration, email verification, public sending limits, document extraction and guided workspace. Totals are calculated in code; the model extracts terms. See [architecture](docs/architecture.md).

## Verified evidence

- 53 automated tests and the frontend/backend TypeScript build pass. Tests cover arithmetic, ownership, stale and duplicate replies, upload boundaries and batch-send atomicity.
- Fresh 390px browser checks passed for the landing, event brief, comparison and upload views. [Public screenshots](docs/evidence/README.md#current-mobile-screens) show the current UI.
- Email-code sign-in was exercised against an owned inbox; verified accounts recover their own events across sessions.
- A real AgentMail loop between two owned inboxes delivered an approved enquiry, fictional quote, opted-in clarification and tax answer. The live total was INR 177,000 for 120 guests at INR 1,250 plus 18% GST.
- Separate fictional PDF and PNG uploads each extracted INR 1,500 per non-vegetarian guest plus 18% GST and calculated INR 141,600 for 80 guests. [Sample files and reproduction steps](docs/evidence/README.md) are public.
- Firecrawl returned real venue source pages. Discovered venues were not emailed during these checks.
- The app is served publicly from the dedicated Convex cloud development deployment. Vibe Apps submission and sponsor-tagged social posting are complete.

The [current 81-second walkthrough](docs/walkthrough.md) was recorded from the September 9 build. Its Drive file was updated in place; the Vibe Apps listing now includes the new description and current brief/comparison screenshots.

## Current boundaries

Verified users can contact three venues per event and send five enquiries per day. Uploads are limited to 4 MiB each and ten per account per day. Secrets stay on the backend; sign-in and provider requests have rate limits. A clarification requires opt-in and happens at most once per venue. The app does not book venues or negotiate contracts.

Automatic ingestion of email attachments, alternate sales-sender routing and published-pricing extraction remain unfinished. Manual document upload is supported. Missing terms remain visible; review original quotes before booking.

The earlier five-case extraction run scored 64/65 fields, 35/35 unstated checks and 5/5 totals before gateway rate limits stopped it. This result predates the document-classification prompt refinement and is retained as [dated partial evidence](experiments/extraction/results-openai-2026-09-09-partial.json). A fresh run using the current prompt completed five of twelve cases: 65/65 fields, 35/35 unstated checks and 5/5 totals. The sixth case hit persistent gateway 429 after retries. The [latest result](experiments/extraction/results-openai.json) records scores, errors, prompt hash and source revision. This is a partial pass, not a completed twelve-case benchmark.

Independent human usability feedback and Luma registration have not been verified. The public app is usable without an invitation; sign-in is required for private events.

## Build history

The [archived build log](docs/archive/build-log-2026-09-08.md) preserves prior test counts, earlier limitations, controlled provider evidence and submission receipts. Those dated notes do not override the current status above. The original promotional animation is archived under `videos/one-table-launch`; the linked browser walkthrough is the submitted demo.
