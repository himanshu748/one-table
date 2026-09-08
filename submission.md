# One Table submission draft

Status: form prepared; submission attempt prompted Vibe Apps sign-in. No submission receipt yet.

## App title
One Table

## Tagline
Find venues, request quotes and compare the real cost for your guest list.

## Description
Planning a family event means comparing emails that price the same gathering in different ways. One venue charges per plate, another offers a package, and another adds hall rent or a food minimum. Taxes and minimum guest counts can change which option costs less.

One Table brings those replies into one comparison. Enter your city, event date and guest count. Firecrawl finds venue contact pages with source links. Choose your shortlist, review the enquiry and approve sending it through AgentMail. When a venue replies, OpenAI extracts its quoted terms and Convex updates the board. You can opt into one clarification about missing taxes, minimum covers or confirmation timing.

The arithmetic runs in code. Unknown terms remain unknown. Every quote keeps its original messages, including source links between a price and a later clarification. Change the guest count to compare per-person prices, packages and minimums, then export the shortlist.

Convex provides email-code authentication, private event records, queries, mutations, scheduled actions, live updates and static hosting. Its rate-limiter component enforces the public trial allowances. Verified users can contact three venues per event and send five enquiries per day. Venue replies take real time; the separate example comparison uses fictional data.

Claude built the initial quote-extraction experiment and comparison interface. Codex completed the backend and provider integrations, fixed arithmetic and reply-merging edge cases, added account verification and sending limits, and tested the public workflow.

We verified 42 automated tests and a controlled email loop between two owned inboxes. A fictional INR 1,250 quote plus 18% GST produced the expected INR 177,000 total for 120 guests. No real venues were contacted in that test. Firecrawl returned real source pages separately. Published-pricing extraction and attachment-only quotes remain unfinished, and the full twelve-fixture extraction benchmark is still incomplete because of provider rate limits.

## Links
- App: https://wooden-dogfish-387.convex.site/
- Repo: https://github.com/himanshu748/one-table
- Video: https://github.com/himanshu748/one-table/releases/download/hackathon-preview/one-table-walkthrough.mp4

## Form details
- Name: Himanshu Kumar (GitHub profile)
- Tags: AllGasHackathon, convex, OpenAI, Firecrawl, codex, AgentMail
- Email: omit unless supplied for notifications
- Screenshot: public landing and example comparison

## Judge instructions
Open the app without an invitation. Choose See how it works for the fictional example, or My events to verify your email and use a private workspace. For real sending, select contacts you intend to approach and review the enquiry. Please do not send fictional requests to real venues. You can paste a sample quote to try extraction without emailing anyone.

## Remaining platform checks
Confirm Luma registration and entrant eligibility. Public repository and hosted 86-second captioned walkthrough are ready. Review the completed Vibe Apps form before the final submission. A public post tagging the sponsors is required by the event and has not been published from this task.
