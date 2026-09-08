import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import schema from "../convex/schema";
import { api, internal } from "../convex/_generated/api";
const modules = import.meta.glob("../convex/**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  const user = await t.run((ctx) => ctx.db.insert("users", {}));
  const owner = t.withIdentity({ subject: user });
  const eventId = await owner.mutation(api.events.create, {
    title: "Reception",
    city: "Mumbai",
    eventDate: "2027-02-14",
    headcount: 120,
    dietary: "veg",
  });
  const vendorId = await owner.mutation(api.vendors.add, {
    eventId,
    name: "Test venue",
    email: "venue@example.com",
  });
  return { t, owner, eventId, vendorId };
}
const extracted = {
  reply_kind: "quote" as const,
  vendor_name: "Test venue",
  pricing_model: "per_head" as const,
  per_head_veg: 1000,
  per_head_nonveg: null,
  package_total: null,
  package_covers: null,
  hall_rent: null,
  fnb_minimum: null,
  min_guarantee_covers: 100,
  taxes_included: true,
  tax_percent: null,
  lead_time_days: 10,
  inclusions: [],
  exclusions: [],
  unstated: [],
};
async function message(
  t: ReturnType<typeof convexTest>,
  eventId: any,
  vendorId: any,
  receivedAt: number,
) {
  return t.run((ctx) =>
    ctx.db.insert("messages", {
      eventId,
      vendorId,
      direction: "in",
      agentmailMessageId: `fixture-${receivedAt}`,
      subject: "Quote",
      body: "Rs 1000 per veg guest, tax included",
      receivedAt,
      askedAbout: [],
      attachmentIds: [],
      extractionStatus: "queued",
    }),
  );
}
describe("private workspace and quote lifecycle", () => {
  it("requires authentication to create an event", async () => {
    const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
    await expect(
      t.mutation(api.events.create, {
        title: "Reception",
        city: "Mumbai",
        eventDate: "2027-02-14",
        headcount: 120,
        dietary: "veg",
      }),
    ).rejects.toThrow();
  });
  it("returns only owned events and refuses another session's board", async () => {
    const { t, eventId } = await setup();
    const other = await t.run((ctx) => ctx.db.insert("users", {}));
    const stranger = t.withIdentity({ subject: other });
    expect(await stranger.query(api.events.list, {})).toEqual([]);
    await expect(
      stranger.query(api.board.forEvent, { eventId }),
    ).rejects.toThrow("not available");
  });
  it("refuses reading another session's replies", async () => {
    const { t, vendorId } = await setup();
    await expect(t.query(api.messages.list, { vendorId })).rejects.toThrow();
  });
  it("deduplicates venue emails within an event", async () => {
    const { owner, vendorId, eventId } = await setup();
    expect(
      await owner.mutation(api.vendors.add, {
        eventId,
        name: "Same venue",
        email: "VENUE@example.com",
      }),
    ).toBe(vendorId);
  });
  it("does not send to unapproved pilot contacts", async () => {
    const { owner, vendorId } = await setup();
    await expect(
      owner.mutation(api.vendors.approveRfq, { vendorId }),
    ).rejects.toThrow("pilot");
  });
  it("stores one quote for repeat extraction results", async () => {
    const { t, eventId, vendorId } = await setup();
    const messageId = await message(t, eventId, vendorId, 100);
    await t.mutation(internal.inbound.saveQuote, {
      messageId,
      extracted,
      pricingFlag: null,
    });
    await t.mutation(internal.inbound.saveQuote, {
      messageId,
      extracted,
      pricingFlag: null,
    });
    const quotes = await t.run((ctx) => ctx.db.query("quotes").collect());
    expect(quotes).toHaveLength(1);
    expect(quotes[0].normalisedTotal).toBe(120000);
  });
  it("a delayed extraction never replaces a newer quote", async () => {
    const { t, eventId, vendorId } = await setup();
    const old = await message(t, eventId, vendorId, 100);
    const newer = await message(t, eventId, vendorId, 200);
    await t.mutation(internal.inbound.saveQuote, {
      messageId: newer,
      extracted: { ...extracted, per_head_veg: 1500 },
      pricingFlag: null,
    });
    await t.mutation(internal.inbound.saveQuote, {
      messageId: old,
      extracted,
      pricingFlag: null,
    });
    const quotes = await t.run((ctx) => ctx.db.query("quotes").collect());
    expect(quotes.filter((q) => q.supersededAt === null)).toHaveLength(1);
    expect(quotes[0].normalisedTotal).toBe(180000);
  });
  it("keeps declined distinct from complete", async () => {
    const { t, eventId, vendorId } = await setup();
    const messageId = await message(t, eventId, vendorId, 100);
    await t.mutation(internal.inbound.saveQuote, {
      messageId,
      extracted: {
        ...extracted,
        reply_kind: "declined",
        pricing_model: "unknown",
        per_head_veg: null,
      },
      pricingFlag: null,
    });
    expect((await t.run((ctx) => ctx.db.get(vendorId)))?.status).toBe(
      "declined",
    );
  });
});

describe("clarification consent and quote continuity", () => {
  it("requires consent and claims a queued clarification only once", async () => {
    const {t,eventId,vendorId} = await setup();
    const messageId = await message(t,eventId,vendorId,100);
    await t.mutation(internal.inbound.saveQuote,{messageId,extracted,pricingFlag:null});
    process.env.PILOT_RECIPIENTS = "venue@example.com";
    try {
      await t.run(ctx=>ctx.db.patch(vendorId,{followupState:"queued",autoFollowup:false}));
      expect(await t.mutation(internal.vendors.claimFollowup,{vendorId,messageId})).toBe(false);
      await t.run(ctx=>ctx.db.patch(vendorId,{followupState:"queued",autoFollowup:true}));
      expect(await t.mutation(internal.vendors.claimFollowup,{vendorId,messageId})).toBe(true);
      expect(await t.mutation(internal.vendors.claimFollowup,{vendorId,messageId})).toBe(false);
    } finally {delete process.env.PILOT_RECIPIENTS;}
  });
  it("combines a tax clarification with its original price and records both sources", async () => {
    const {t,eventId,vendorId} = await setup();
    const first = await message(t,eventId,vendorId,100);
    await t.mutation(internal.inbound.saveQuote,{messageId:first,extracted:{...extracted,taxes_included:false,tax_percent:null},pricingFlag:null});
    await t.run(ctx=>ctx.db.insert("messages",{eventId,vendorId,direction:"out",agentmailMessageId:"out-test",subject:"GST?",body:"What rate?",receivedAt:150,askedAbout:["tax_percent"],attachmentIds:[]}));
    const second = await message(t,eventId,vendorId,200);
    await t.mutation(internal.inbound.saveQuote,{messageId:second,extracted:{...extracted,reply_kind:"no_price",pricing_model:"unknown",per_head_veg:null,taxes_included:null,tax_percent:18,min_guarantee_covers:null,lead_time_days:null},pricingFlag:null});
    const live = await t.run(ctx=>ctx.db.query("quotes").withIndex("by_vendor_live",q=>q.eq("vendorId",vendorId).eq("supersededAt",null)).unique());
    expect(live?.normalisedTotal).toBe(141600);
    expect(live?.sourceMessageIds).toEqual([first,second]);
  });
  it("an autoresponder does not erase an existing quote", async () => {
    const {t,eventId,vendorId} = await setup();
    const first = await message(t,eventId,vendorId,100);
    await t.mutation(internal.inbound.saveQuote,{messageId:first,extracted,pricingFlag:null});
    const second = await message(t,eventId,vendorId,200);
    await t.mutation(internal.inbound.saveQuote,{messageId:second,extracted:{...extracted,reply_kind:"auto_reply",pricing_model:"unknown",per_head_veg:null},pricingFlag:null});
    const quotes = await t.run(ctx=>ctx.db.query("quotes").collect());
    expect(quotes).toHaveLength(1);
    expect(quotes[0].supersededAt).toBeNull();
  });
  it("rejects an incoming sender outside the recorded venue thread", async () => {
    const {t,vendorId,eventId} = await setup();
    await t.run(ctx=>ctx.db.patch(vendorId,{threadId:"thread-test"}));
    await t.run(ctx=>ctx.db.patch(eventId,{agentInboxId:"buyer@example.com"}));
    expect(await t.mutation(internal.inbound.recordReply,{agentmailMessageId:"test-incoming",threadId:"thread-test",inboxId:"buyer@example.com",from:"other@example.com",subject:"Hello",body:"Quote",receivedAt:100})).toBeNull();
  });
});

it("a no-price acknowledgement preserves the current quote", async () => {
  const {t,eventId,vendorId} = await setup();
  const first = await message(t,eventId,vendorId,100);
  await t.mutation(internal.inbound.saveQuote,{messageId:first,extracted,pricingFlag:null});
  const second = await message(t,eventId,vendorId,200);
  await t.mutation(internal.inbound.saveQuote,{messageId:second,extracted:{...extracted,reply_kind:"no_price",pricing_model:"unknown",per_head_veg:null},pricingFlag:null});
  const live = await t.run(ctx=>ctx.db.query("quotes").withIndex("by_vendor_live",q=>q.eq("vendorId",vendorId).eq("supersededAt",null)).unique());
  expect(live?.messageId).toBe(first);
  expect(live?.normalisedTotal).toBe(120000);
});

describe("public trial sending", () => {
  async function verifiedSetup() {
    const state = await setup();
    await state.t.run(async ctx=>{
      const event = await ctx.db.get(state.eventId);
      await ctx.db.patch(event!.userId,{email:"buyer@example.com",emailVerificationTime:Date.now()});
    });
    return state;
  }
  it("requires verification even when public sending is enabled", async()=>{
    process.env.PUBLIC_SENDING_ENABLED="true";
    try {
      const {owner,vendorId}=await setup();
      await expect(owner.mutation(api.vendors.approveRfq,{vendorId})).rejects.toThrow("Verify your email");
    } finally {delete process.env.PUBLIC_SENDING_ENABLED;}
  });
  it("allows a verified user to queue an ordinary contact, but never twice", async()=>{
    process.env.PUBLIC_SENDING_ENABLED="true";
    try {
      const {owner,t,vendorId}=await verifiedSetup();
      await owner.mutation(api.vendors.approveRfq,{vendorId});
      expect((await t.run(ctx=>ctx.db.get(vendorId)))?.outboundState).toBe("queued");
      await expect(owner.mutation(api.vendors.approveRfq,{vendorId})).rejects.toThrow("already queued");
      expect(await t.mutation(internal.vendors.claimSend,{vendorId})).toBe(true);
      expect(await t.mutation(internal.vendors.claimSend,{vendorId})).toBe(false);
    } finally {delete process.env.PUBLIC_SENDING_ENABLED;}
  });
  it("enforces three contacts per event", async()=>{
    process.env.PUBLIC_SENDING_ENABLED="true";
    try {
      const {owner,eventId}=await verifiedSetup();
      for(let i=0;i<3;i++) {
        const vendorId=await owner.mutation(api.vendors.add,{eventId,name:`Venue ${i}`,email:`v${i}@example.com`});
        await owner.mutation(api.vendors.approveRfq,{vendorId});
      }
      const fourth=await owner.mutation(api.vendors.add,{eventId,name:"Fourth",email:"fourth@example.com"});
      await expect(owner.mutation(api.vendors.approveRfq,{vendorId:fourth})).rejects.toThrow("three venues");
    } finally {delete process.env.PUBLIC_SENDING_ENABLED;}
  });
  it("enforces account quota across events", async()=>{
    process.env.PUBLIC_SENDING_ENABLED="true";
    try {
      const {owner}=await verifiedSetup();
      for(let i=0;i<6;i++) {
        const eventId=await owner.mutation(api.events.create,{title:`Event ${i}`,city:"Mumbai",eventDate:"2027-02-14",headcount:120,dietary:"veg"});
        const vendorId=await owner.mutation(api.vendors.add,{eventId,name:`Venue ${i}`,email:`limit${i}@example.com`});
        if(i<5) await owner.mutation(api.vendors.approveRfq,{vendorId});
        else await expect(owner.mutation(api.vendors.approveRfq,{vendorId})).rejects.toThrow();
      }
    } finally {delete process.env.PUBLIC_SENDING_ENABLED;}
  });
  it("can disable public sends without affecting account access", async()=>{
    const {owner,vendorId}=await verifiedSetup();
    await expect(owner.mutation(api.vendors.approveRfq,{vendorId})).rejects.toThrow("pilot");
    expect((await owner.query(api.account.current,{})).verified).toBe(true);
  });
  it("limits authentication email requests before contacting the provider", async()=>{
    const {t}=await setup();
    await t.mutation(internal.limits.reserveAuthEmail,{email:"test@example.com"});
    await expect(t.mutation(internal.limits.reserveAuthEmail,{email:"test@example.com"})).rejects.toThrow("Too many");
  });
});
