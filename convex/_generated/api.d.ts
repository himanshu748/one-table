/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as attachmentData from "../attachmentData.js";
import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as board from "../board.js";
import type * as crons from "../crons.js";
import type * as discover from "../discover.js";
import type * as discoveryData from "../discoveryData.js";
import type * as events from "../events.js";
import type * as extract from "../extract.js";
import type * as http from "../http.js";
import type * as inbound from "../inbound.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_attachments from "../lib/attachments.js";
import type * as lib_brief from "../lib/brief.js";
import type * as lib_extractionContract from "../lib/extractionContract.js";
import type * as lib_mergeTerms from "../lib/mergeTerms.js";
import type * as lib_normalise from "../lib/normalise.js";
import type * as lib_sending from "../lib/sending.js";
import type * as lib_webhook from "../lib/webhook.js";
import type * as limits from "../limits.js";
import type * as messages from "../messages.js";
import type * as nudge from "../nudge.js";
import type * as outbound from "../outbound.js";
import type * as staticHosting from "../staticHosting.js";
import type * as validators from "../validators.js";
import type * as vendors from "../vendors.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  attachmentData: typeof attachmentData;
  attachments: typeof attachments;
  auth: typeof auth;
  board: typeof board;
  crons: typeof crons;
  discover: typeof discover;
  discoveryData: typeof discoveryData;
  events: typeof events;
  extract: typeof extract;
  http: typeof http;
  inbound: typeof inbound;
  "lib/access": typeof lib_access;
  "lib/attachments": typeof lib_attachments;
  "lib/brief": typeof lib_brief;
  "lib/extractionContract": typeof lib_extractionContract;
  "lib/mergeTerms": typeof lib_mergeTerms;
  "lib/normalise": typeof lib_normalise;
  "lib/sending": typeof lib_sending;
  "lib/webhook": typeof lib_webhook;
  limits: typeof limits;
  messages: typeof messages;
  nudge: typeof nudge;
  outbound: typeof outbound;
  staticHosting: typeof staticHosting;
  validators: typeof validators;
  vendors: typeof vendors;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
  selfHosting: import("@convex-dev/static-hosting/_generated/component.js").ComponentApi<"selfHosting">;
};
