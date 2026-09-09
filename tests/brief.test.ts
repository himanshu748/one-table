import { describe, it, expect } from "vitest";
import { enquiryText, discoveryQuery } from "../convex/lib/brief";
import { validateAttachment, MAX_FILE_BYTES } from "../convex/lib/attachments";
const brief = {
  title: "Birthday",
  eventType: "Birthday",
  city: "Mumbai",
  neighbourhood: "Bandra",
  eventDate: "2027-03-12",
  dateFlexible: true,
  headcount: 80,
  dietary: "nonveg" as const,
  needs: ["Parking"],
  budgetHint: 150000,
};
describe("event brief and document boundaries", () => {
  it("uses menu, area and flexibility in the actual enquiry but keeps budget private", () => {
    const text = enquiryText(brief);
    expect(text).toContain("Bandra, Mumbai");
    expect(text).toContain("nearby dates");
    expect(text).toContain("nonveg");
    expect(text).toContain("Parking");
    expect(text).not.toContain("150000");
    expect(text).toContain("service charges");
  });
  it("searches with area, event type, headcount and must-haves", () => {
    expect(discoveryQuery(brief)).toContain(
      "Bandra Mumbai Birthday venue 80 guests Parking",
    );
  });
  it("rejects spoofed formats and oversized files", () => {
    expect(() =>
      validateAttachment(
        new TextEncoder().encode("<html>").buffer,
        "image/png",
        "x.png",
      ),
    ).toThrow();
    expect(() =>
      validateAttachment(
        new ArrayBuffer(MAX_FILE_BYTES + 1),
        "application/pdf",
        "x.pdf",
      ),
    ).toThrow();
    expect(() =>
      validateAttachment(new ArrayBuffer(0), "application/pdf", "x.pdf"),
    ).toThrow();
  });
  it("accepts supported file signatures", () => {
    expect(() =>
      validateAttachment(
        new TextEncoder().encode("%PDF-1.4").buffer,
        "application/pdf",
        "quote.pdf",
      ),
    ).not.toThrow();
    expect(() =>
      validateAttachment(
        new Uint8Array([255, 216, 255, 224]).buffer,
        "image/jpeg",
        "quote.jpg",
      ),
    ).not.toThrow();
  });
});
