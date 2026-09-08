import { v } from "convex/values";
import schema, { quoteFields } from "./schema";
export const eventDoc = v.object({
  ...schema.tables.events.validator.fields,
  _id: v.id("events"),
  _creationTime: v.number(),
});
export const vendorDoc = v.object({
  ...schema.tables.vendors.validator.fields,
  _id: v.id("vendors"),
  _creationTime: v.number(),
});
export const messageDoc = v.object({
  ...schema.tables.messages.validator.fields,
  _id: v.id("messages"),
  _creationTime: v.number(),
});
export const quoteDoc = v.object({
  ...schema.tables.quotes.validator.fields,
  _id: v.id("quotes"),
  _creationTime: v.number(),
});
export const extractedQuote = v.object(quoteFields);
export const normalised = v.object({
  total: v.union(v.number(), v.null()),
  isPreTax: v.boolean(),
  blocker: v.union(v.string(), v.null()),
  notes: v.array(v.string()),
});
