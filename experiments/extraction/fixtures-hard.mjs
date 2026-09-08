// Adversarial set. These are the replies that break a naive extractor, and
// every one of them is ordinary inbox traffic rather than an edge case.
//
// The dangerous failures here are not "returns nothing". They are "returns a
// confident number that came from the wrong place", because that silently
// reorders the board.

export const hardFixtures = [
  {
    id: "quoted-thread-contamination",
    subject: "Re: Reception for 120 guests, Mumbai, 14 Feb",
    body: `Dear Sir,

Thank you for your enquiry. For your date we can offer Rs 1,450 per plate for
the vegetarian menu. GST extra.

Regards,
Deepak
Sunrise Banquets

> On 8 Sep, One Table <buyer@agentmail.to> wrote:
>
> Hello,
>
> I am pricing a reception in Mumbai on 14 Feb for 120 guests (veg).
> Our budget is around Rs 1,100 per head and we would like to stay
> under Rs 1,50,000 in total.
>
> Could you send your rate for that date, and confirm whether it
> includes taxes, what the minimum cover count is, and how far ahead
> you need confirmation?
>
> Thanks.`,
    truth: {
      reply_kind: "quote",
      vendor_name: "Sunrise Banquets",
      pricing_model: "per_head",
      per_head_veg: 1450,
      per_head_nonveg: null,
      package_total: null,
      package_covers: null,
      hall_rent: null,
      fnb_minimum: null,
      min_guarantee_covers: null,
      taxes_included: false,
      tax_percent: null,
      lead_time_days: null,
    },
  },

  {
    id: "out-of-office",
    subject: "Automatic reply: Reception for 120 guests",
    body: `I am currently out of office on annual leave and will return on 20 February.

For urgent banquet enquiries please contact Rahul on 98200 xxxxx or
rahul@royalgardens.in. Our standard packages start from Rs 1,299 per plate.

This is an automated response.

Meera Joshi
Royal Gardens`,
    truth: {
      reply_kind: "auto_reply",
      // An autoresponder is not a quote. "Packages start from Rs 1,299" is
      // boilerplate signature copy, and treating it as this vendor's offer for
      // this date puts a fabricated row at the top of the board.
      vendor_name: "Royal Gardens",
      pricing_model: "unknown",
      per_head_veg: null,
      per_head_nonveg: null,
      package_total: null,
      package_covers: null,
      hall_rent: null,
      fnb_minimum: null,
      min_guarantee_covers: null,
      taxes_included: null,
      tax_percent: null,
      lead_time_days: null,
    },
  },

  {
    id: "declined-date",
    subject: "Re: Reception 14 Feb",
    body: `Hi,

Thanks for thinking of us. Unfortunately we are already blocked for 14th
February, it is a peak date and we confirmed another wedding last month.

If your dates are flexible we have 21st and 22nd open at Rs 1,375 per plate.

Best,
Anita
Lotus Grand`,
    truth: {
      reply_kind: "declined",
      // They cannot serve the date asked about. The alternate-date rate is not
      // a quote for this event.
      vendor_name: "Lotus Grand",
      pricing_model: "unknown",
      per_head_veg: null,
      per_head_nonveg: null,
      package_total: null,
      package_covers: null,
      hall_rent: null,
      fnb_minimum: null,
      min_guarantee_covers: null,
      taxes_included: null,
      tax_percent: null,
      lead_time_days: null,
    },
  },

  {
    id: "price-range",
    subject: "Re: Enquiry",
    body: `Hello,

Our per plate cost works out between Rs 1,200 and Rs 1,500 depending on how
many live counters you want and whether you go with the premium dessert
selection. Taxes are extra at 18%.

Happy to firm this up once you pick a menu.

Nikhil
Copper Kitchen`,
    truth: {
      reply_kind: "quote",
      // Rule: a range records its lower bound and flags "price_range" as
      // unstated, so the board shows a "from" price rather than pretending a
      // firm number exists. The low end alone would make them look cheapest.
      vendor_name: "Copper Kitchen",
      pricing_model: "per_head",
      per_head_veg: 1200,
      per_head_nonveg: null,
      package_total: null,
      package_covers: null,
      hall_rent: null,
      fnb_minimum: null,
      min_guarantee_covers: null,
      taxes_included: false,
      tax_percent: 18,
      lead_time_days: null,
    },
    requireUnstated: ["price_range"],
  },

  {
    id: "lakh-notation",
    subject: "Re: 14 Feb reception",
    body: `Namaste,

For 150 pax our all-in package comes to 2.5L including taxes. This covers
hall, decor, veg and non-veg buffet and DJ.

We need 2 weeks notice.

Suresh
Maharaja Lawns`,
    truth: {
      reply_kind: "quote",
      vendor_name: "Maharaja Lawns",
      pricing_model: "package",
      per_head_veg: null,
      per_head_nonveg: null,
      package_total: 250000,
      package_covers: 150,
      hall_rent: null,
      fnb_minimum: null,
      min_guarantee_covers: null,
      taxes_included: true,
      tax_percent: null,
      lead_time_days: 14,
    },
  },

  {
    id: "revised-price",
    subject: "Re: Re: Reception for 120 guests",
    body: `Hi again,

Further to our call just now, I spoke to my manager. We can bring it down to
Rs 1,150 per plate from the Rs 1,325 I quoted earlier, on the condition that
you confirm this week.

GST 18% applies on top as before. Minimum 120 covers.

Regards,
Vikram
Silver Oak Banquets`,
    truth: {
      reply_kind: "quote",
      // The live offer is the revised one. Extracting the superseded number
      // ranks this vendor worse than they actually are.
      vendor_name: "Silver Oak Banquets",
      pricing_model: "per_head",
      per_head_veg: 1150,
      per_head_nonveg: null,
      package_total: null,
      package_covers: null,
      hall_rent: null,
      fnb_minimum: null,
      min_guarantee_covers: 120,
      taxes_included: false,
      tax_percent: 18,
      lead_time_days: null,
    },
  },
];
