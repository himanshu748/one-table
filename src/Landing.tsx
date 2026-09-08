import { useState } from "react";
import "./landing.css";
const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;
export default function Landing() {
  const [guests, setGuests] = useState(120);
  return <div className="landing">
    <section className="landing-hero">
      <div className="hero-copy">
        <h1>A celebration.<br />A dozen quotes.<br /><em>One clear choice.</em></h1>
        <p>Per plate. Per package. Plus taxes. Bring your venue quotes together and see what they cost for the people on your guest list.</p>
        <div className="landing-actions"><a className="action-primary" href="#workspace">Compare my quotes <Arrow /></a><a className="action-text" href="#demo">See how it works <Arrow /></a></div>
        <p className="hero-footnote">Your own quotes, in a private workspace.<br />Just looking? The demo uses fictional venues.</p>
      </div>
      <div className="comparison-scene" aria-label="Interactive comparison with mock prices">
        <div className="scene-top"><span>A reception in Mumbai</span><span>Mock example</span></div>
        <div className="quote-fragments"><div><span>From the first reply</span><p>“₹1,250 per guest.<br />All taxes included.”</p></div><div><span>From the second reply</span><p>“₹1.8 lakh package.<br />Up to 150 guests.”</p></div></div>
        <div className="scene-bridge"><span>Different formats. Same guest list.</span><Arrow /></div>
        <div className="scene-result"><div className="scene-heading"><h2>Your comparison</h2><span>Tax included</span></div>
          <div className="scene-row"><div><strong>The Courtyard</strong><small>Per guest · minimum 100</small></div><span>{money(Math.max(100, guests)*1250)}</span></div>
          <div className="scene-row"><div><strong>Marigold House</strong><small>Fixed package · up to 150</small></div><span>{guests <= 150 ? money(180000) : "Confirm capacity"}</span></div>
          <label className="scene-slider" htmlFor="preview-guests"><span>Move the guest count</span><strong>{guests} guests</strong></label><input id="preview-guests" aria-label="Preview guest count" type="range" min="80" max="200" step="10" value={guests} onChange={e=>setGuests(Number(e.target.value))} />
          <p className="scene-insight" aria-live="polite">{guests>150 ? "The package needs a new quote for this many guests." : guests>144 ? "At this guest count, the fixed package costs less." : guests<100 ? "The per-guest quote still charges for 100 guests." : "At this guest count, the per-guest quote costs less."}</p>
        </div>
      </div>
    </section>
    <div className="landing-caption"><span>For receptions, reunions, and everything worth bringing people together for.</span><a href="#how-it-works">See how it works <Arrow /></a></div>
    <section className="landing-method" id="how-it-works"><div><h2>Keep the occasion big.<br /><em>Make the small print clear.</em></h2><p>You should be choosing a place you love, with a comparison you can actually read.</p></div><ol><li><h3>Find your venues.</h3><p>Enter your city, date and guest count. Discover venue contacts with source links, choose your shortlist and approve your enquiries. You can also paste replies you already have.</p></li><li><h3>Put every price on the same basis.</h3><p>AI extracts the quoted terms. The comparison calculates packages, food minimums and per-guest rates at your chosen headcount.</p></li><li><h3>See what still needs an answer.</h3><p>Unknown taxes and missing terms stay visible. Review the original messages, change your guest count and export your shortlist.</p></li></ol></section>
    <section className="landing-truth"><div className="truth-sample"><span>When a reply says</span><blockquote>“Starting from ₹1,100 per plate. Taxes extra.”</blockquote><div><strong>Needs confirmation</strong><p>A starting price isn’t a final quote. The tax rate still needs an answer.</p></div><small>Illustrative reply</small></div><div className="truth-copy"><h2>A missing detail<br />should look <em>missing.</em></h2><p>The cheapest-looking quote isn’t always the cheapest venue. One Table separates confirmed totals from prices with unresolved terms.</p><p>Your original reply stays alongside the extraction, so you can check what the venue actually said before making a decision.</p><a className="action-text" href="#demo">Explore the example comparison <Arrow /></a></div></section>
    <section className="landing-faq"><h2>Before you pull up a chair.</h2><div><details><summary>Can I use my own quotes today?</summary><p>Yes. Create a private event, add venues and paste their replies. Your text is saved in Convex and sent to OpenAI to extract the terms. Review each extraction against the original before booking. This is an early pilot, and extraction can need a retry.</p></details><details><summary>Is the demo connected to real venues?</summary><p>No. The demo is a separate, interactive example using fictional replies and saved extraction results. It does not send email, create an event or use your private records.</p></details><details><summary>Will One Table email venues for me?</summary><p>Yes. Verify your email, select a venue and approve the enquiry. The public trial allows three venues per event and five enquiries per day, subject to shared service limits. You can also allow one automatic clarification for missing terms. Incoming replies update your comparison; response times depend on the venue. Discovery does not send messages.</p></details><details><summary>How do I return to my quotes?</summary><p>Use My events and sign in with the same email address. We send a fresh sign-in code, so you can return from another device without a password. If you started in a guest workspace, verify your email there before clearing browser storage.</p></details></div></section>
    <section className="landing-close"><h2>More time for the people.<br /><em>Less time in the spreadsheet.</em></h2><a className="action-primary" href="#workspace">Start your comparison <Arrow /></a><a className="action-text" href="#demo">Or take a look around the demo</a></section>
  </div>;
}
function Arrow() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" /></svg> }
