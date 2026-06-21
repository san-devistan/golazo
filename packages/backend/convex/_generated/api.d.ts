/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cartPricing from "../cartPricing.js";
import type * as checkout from "../checkout.js";
import type * as checkoutModel from "../checkoutModel.js";
import type * as cloudinary from "../cloudinary.js";
import type * as cloudinaryFolders from "../cloudinaryFolders.js";
import type * as customer from "../customer.js";
import type * as emailDelivery from "../emailDelivery.js";
import type * as http from "../http.js";
import type * as orderEmailTemplates from "../orderEmailTemplates.js";
import type * as orderEmails from "../orderEmails.js";
import type * as orders from "../orders.js";
import type * as shop from "../shop.js";
import type * as shopValidators from "../shopValidators.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  cartPricing: typeof cartPricing;
  checkout: typeof checkout;
  checkoutModel: typeof checkoutModel;
  cloudinary: typeof cloudinary;
  cloudinaryFolders: typeof cloudinaryFolders;
  customer: typeof customer;
  emailDelivery: typeof emailDelivery;
  http: typeof http;
  orderEmailTemplates: typeof orderEmailTemplates;
  orderEmails: typeof orderEmails;
  orders: typeof orders;
  shop: typeof shop;
  shopValidators: typeof shopValidators;
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
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
  resend: import("@convex-dev/resend/_generated/component.js").ComponentApi<"resend">;
  stripe: import("@convex-dev/stripe/_generated/component.js").ComponentApi<"stripe">;
};
