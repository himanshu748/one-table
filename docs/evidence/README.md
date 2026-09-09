# Reproducible fictional quote

The [PDF](fictional-quote.pdf) and [PNG](fictional-quote.png) contain a deliberately fictional quote, without customer information.

1. Sign in to the public app with your own email.
2. Create an event for 80 guests, non-vegetarian, with an optional INR 150,000 budget. Turn contact search off for this document-only check.
3. Add a manual contact using an inbox you own. Do not approve an enquiry.
4. Open Replies & documents, choose Upload a quote, and upload either sample.
5. Wait for extraction, then open Compare quotes.

Expected extracted terms: INR 1,500 per non-vegetarian guest, minimum 80 guests, GST 18% extra, ten-day confirmation. Expected calculated total: `80 × 1500 × 1.18 = INR 141,600`, or INR 1,770 per guest, INR 8,400 below the sample budget. The hall is included; it should not be classified as separate hall rental.

Both files completed real extraction on September 9. An earlier image attempt misclassified the included hall; the prompt was corrected and the retest passed. This controlled example is not evidence of a real venue offer or a completed twelve-case benchmark.

Uploads alone do not send venue email. Provider limits can delay or stop extraction.


## Current mobile screens

Browser checks on September 9 used a real 390 × 844 Playwright viewport and the deployed app. Landing, brief, comparison and upload screens were inspected; measured document width was 390px on the landing, comparison and upload views. Email-code login succeeded in this fresh browser. Both brief steps were exercised, and Continue remained on step two without creating an event.

[Landing](landing-mobile.png) · [Brief](brief-mobile.png) · [Preferences](preferences-mobile.png) · [Comparison](comparison-mobile.png) · [Upload](upload-mobile.png)

These are automated browser checks, not independent human feedback. Earlier in-app viewport override attempts did not change the viewport; these fresh Playwright checks supersede that limitation.


Current desktop captures at 1280 × 960: [preferences](preferences-desktop.png) and [comparison](comparison-desktop.png).
