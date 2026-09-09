export type Brief = {
  title: string;
  city: string;
  eventDate: string;
  headcount: number;
  dietary: "veg" | "nonveg" | "both";
  needs?: string[];
  budgetHint?: number | null;
  neighbourhood?: string;
  dateFlexible?: boolean;
  eventType?: string;
};
export function enquiryText(e: Brief) {
  return `Hello,\n\nI am pricing a ${e.title.toLowerCase()} in ${[e.neighbourhood, e.city].filter(Boolean).join(", ")} on ${e.eventDate}${e.dateFlexible ? " (nearby dates are also possible)" : ""} for ${e.headcount} guests (${e.dietary === "both" ? "veg and non-veg" : e.dietary}).\n\nCould you confirm availability and send your rate, including GST, service charges, hall rent, minimum covers and any compulsory extras? Please also confirm how far ahead you need a decision.\n\n${e.needs?.length ? `We also need: ${e.needs.join(", ")}.\n\n` : ""}Please show the pricing basis and what is included so I can compare the full cost.\n\nThanks.`;
}
export function discoveryQuery(e: Brief) {
  return `${[e.neighbourhood, e.city].filter(Boolean).join(" ")} ${e.eventType || "banquet"} venue ${e.headcount} guests ${e.needs?.slice(0, 2).join(" ") || ""} official contact email`;
}
