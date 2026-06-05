/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAuditLogs from "../adminAuditLogs.js";
import type * as depositRequests from "../depositRequests.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as inviteRewards from "../inviteRewards.js";
import type * as listings from "../listings.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as stats from "../stats.js";
import type * as supportTickets from "../supportTickets.js";
import type * as systemSettings from "../systemSettings.js";
import type * as trades from "../trades.js";
import type * as users from "../users.js";
import type * as withdrawRequests from "../withdrawRequests.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAuditLogs: typeof adminAuditLogs;
  depositRequests: typeof depositRequests;
  emails: typeof emails;
  http: typeof http;
  inviteRewards: typeof inviteRewards;
  listings: typeof listings;
  messages: typeof messages;
  notifications: typeof notifications;
  reviews: typeof reviews;
  seed: typeof seed;
  stats: typeof stats;
  supportTickets: typeof supportTickets;
  systemSettings: typeof systemSettings;
  trades: typeof trades;
  users: typeof users;
  withdrawRequests: typeof withdrawRequests;
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

export declare const components: {};
