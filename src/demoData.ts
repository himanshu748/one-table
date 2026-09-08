import raw from "../experiments/extraction/results.json";
import type { ExtractedQuote } from "../convex/lib/normalise";

// These quotes are the literal output of the extraction run in
// experiments/extraction, not numbers typed in by hand. Re-run
// `npm run extract:test` and this board reflects the new run.
export type DemoRow = {
  id: string;
  vendorName: string;
  quote: ExtractedQuote & { lead_time_days: number | null };
  // What the vendor's own website advertises, used to flag a quote that
  // exceeds public pricing. Stands in for the Firecrawl cross-check until
  // that integration lands.
  publishedPerHead: number | null;
  repliedAgoMins: number;
  followUpSentAgoMins: number | null;
};

// Only Vasant Vihar has a scraped public rate, which is why it is the one row
// carrying the Firecrawl cross-check flag.
const PUBLISHED: Record<string, number> = { "wrong-headcount-answer": 1199 };

const REPLIED_AGO: Record<string, number> = {
  "sagar-per-head-split": 214,
  "grandeur-package-flat": 96,
  "orchid-hall-plus-fnb": 41,
  "terse-pdf-attachment": 8,
  "wrong-headcount-answer": 163,
  "pitch-with-buried-price": 27,
  "quoted-thread-contamination": 52,
  "out-of-office": 190,
  "declined-date": 122,
  "price-range": 73,
  "lakh-notation": 15,
  "revised-price": 3,
};

export const extractedBy = `${raw.provider}/${raw.model}`;
export const extractedAt = raw.at;

export const demoRows: DemoRow[] = raw.results.map((r) => ({
  id: r.id,
  vendorName: r.extracted.vendor_name ?? "Unidentified sender",
  quote: r.extracted as DemoRow["quote"],
  publishedPerHead: PUBLISHED[r.id] ?? null,
  repliedAgoMins: REPLIED_AGO[r.id] ?? 0,
  followUpSentAgoMins: r.id === "terse-pdf-attachment" ? 4 : null,
}));

export const demoEvent = {
  title: "Reception",
  city: "Mumbai",
  date: "14 Feb",
  defaultHeadcount: raw.headcount,
};
