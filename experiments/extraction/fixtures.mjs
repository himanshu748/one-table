// Six replies in the shapes venues and caterers actually send, with hand-labelled
// truth. `null` means the vendor did not state it. That distinction is the whole
// point of the test: inventing a number here is worse than leaving it blank.

export const HEADCOUNT = 120;

export const fixtures = [
  {
    id: "sagar-per-head-split",
    subject: "Re: Enquiry for 120 pax reception, 14 Feb",
    body: `Dear Sir,

Greetings from Sagar Banquets!

Thank you for your enquiry. Please find our tariff below:

Veg menu - Rs. 1250 per plate
Non-veg menu - Rs. 1550 per plate

Above rates are exclusive of GST.

Menu includes 2 welcome drinks, 4 starters, 6 main course, 2 desserts.
Unlimited soft drinks included.

Minimum guarantee 100 pax applicable.

Kindly note DJ and decoration are chargeable extra.

Awaiting your confirmation.

Regards,
Prakash
Sagar Banquets, Andheri West`,
    truth: {
      reply_kind: "quote",
      vendor_name: "Sagar Banquets",
      pricing_model: "per_head",
      per_head_veg: 1250,
      per_head_nonveg: 1550,
      package_total: null,
      package_covers: null,
      hall_rent: null,
      fnb_minimum: null,
      min_guarantee_covers: 100,
      taxes_included: false,
      tax_percent: null,
      lead_time_days: null,
    },
  },

  {
    id: "grandeur-package-flat",
    subject: "RE: Reception enquiry",
    body: `Hi,

Please find attached our banquet package.

Silver package for 150 pax - Rs. 2,10,000 all inclusive
Includes hall, basic decor, veg buffet, service staff.

Taxes included in the above.

Advance 50% at booking. Balance one week prior.
Cancellation - advance non refundable within 30 days of event.

We need minimum 10 days notice for the date.

Thanks
Ritu Shah
Grandeur Hall`,
    truth: {
      reply_kind: "quote",
      vendor_name: "Grandeur Hall",
      pricing_model: "package",
      per_head_veg: null,
      per_head_nonveg: null,
      package_total: 210000,
      package_covers: 150,
      hall_rent: null,
      fnb_minimum: null,
      min_guarantee_covers: null,
      taxes_included: true,
      tax_percent: null,
      lead_time_days: 10,
    },
  },

  {
    id: "orchid-hall-plus-fnb",
    subject: "Re: Availability 14th Feb evening",
    body: `Dear Himanshu,

14th Feb evening slot is available.

Our commercials:

Hall rental: Rs 75,000 for the evening slot (6pm to 11pm)
F&B minimum: Rs 1,40,000

F&B is charged at actuals against the minimum. Veg buffet starts 1100/head,
non veg 1400/head. GST 18% extra on total.

Rental includes basic lighting, tables, chairs, linen.
Decor, DJ, valet not included.

Regards
Sanjay Nair
Orchid Convention Centre`,
    truth: {
      reply_kind: "quote",
      vendor_name: "Orchid Convention Centre",
      pricing_model: "hall_plus_fnb",
      per_head_veg: 1100,
      per_head_nonveg: 1400,
      package_total: null,
      package_covers: null,
      hall_rent: 75000,
      fnb_minimum: 140000,
      min_guarantee_covers: null,
      taxes_included: false,
      tax_percent: 18,
      lead_time_days: null,
    },
  },

  {
    id: "terse-pdf-attachment",
    subject: "Re: Quote request",
    body: `Hi,

PFA our rate card.

Rgds
Amit`,
    truth: {
      reply_kind: "no_price",
      vendor_name: null,
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
    id: "wrong-headcount-answer",
    subject: "Re: 120 pax enquiry for reception",
    body: `Hello,

Thank you for reaching out to Vasant Vihar Banquets.

For 200 guests our rate is Rs 999 per plate inclusive of all taxes for the
veg menu. This is our promotional rate valid for bookings above 200 pax only.

For smaller gatherings below 150 the applicable rate is Rs 1,349 per plate
plus taxes as applicable.

Decor packages start from Rs 35,000.

Do let me know.

Warm regards,
Neha Kulkarni
Sales Manager`,
    truth: {
      reply_kind: "quote",
      vendor_name: "Vasant Vihar Banquets",
      pricing_model: "per_head",
      per_head_veg: 1349,
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
    id: "pitch-with-buried-price",
    subject: "Re: Wedding reception enquiry - 14 Feb",
    body: `Dear Guest,

Namaste and warm greetings from The Emerald Court!

Established in 1998, The Emerald Court has been the preferred destination for
over 4000 celebrations across Mumbai. Our award winning culinary team, led by
Chef Ramesh who trained at the Oberoi, brings you a curated experience that
your guests will remember for a lifetime. Our pillarless banquet hall
accommodates up to 400 guests in comfort with valet parking for 80 cars.

We would be delighted to host your reception on the 14th.

Our all inclusive per guest tariff for the evening comes to Rs 1,795 which
covers the hall, our signature seven course non vegetarian buffet, standard
floral decor, DJ till 11pm and service staff. Vegetarian is Rs 1,595.
All government taxes are on top of this at prevailing rates.

We would require confirmation at least three weeks in advance to block
the date, along with 40% advance.

Looking forward to welcoming you.

Sincerely,
Farhan Qureshi
Banquet Sales, The Emerald Court`,
    truth: {
      reply_kind: "quote",
      vendor_name: "The Emerald Court",
      pricing_model: "per_head",
      per_head_veg: 1595,
      per_head_nonveg: 1795,
      package_total: null,
      package_covers: null,
      hall_rent: null,
      fnb_minimum: null,
      min_guarantee_covers: null,
      taxes_included: false,
      tax_percent: null,
      lead_time_days: 21,
    },
  },
];

// Scored fields. Numeric and boolean only, because free text inclusions are a
// judgement call and would make the score meaningless.
export const SCORED_FIELDS = [
  "reply_kind",
  "vendor_name",
  "pricing_model",
  "per_head_veg",
  "per_head_nonveg",
  "package_total",
  "package_covers",
  "hall_rent",
  "fnb_minimum",
  "min_guarantee_covers",
  "taxes_included",
  "tax_percent",
  "lead_time_days",
];
