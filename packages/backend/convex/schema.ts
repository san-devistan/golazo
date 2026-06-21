import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

import {
  cartConfigurationSummaryValidator,
  checkoutFulfillmentStatusValidator,
  checkoutOrderStatusValidator,
  checkoutShippingAddressValidator,
  productMetadataTypeValidator,
  productOptionConfigValidator,
  productOptionTemplateKindValidator,
  productStatusValidator,
} from "./shopValidators"

export default defineSchema({
  catalogCategories: defineTable({
    name: v.string(),
    slug: v.string(),
    parentId: v.union(v.id("catalogCategories"), v.null()),
    path: v.string(),
    depth: v.number(),
    cloudinaryFolder: v.string(),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_parentId_and_sortOrder", ["parentId", "sortOrder"])
    .index("by_parentId_and_slug", ["parentId", "slug"])
    .index("by_path", ["path"]),

  products: defineTable({
    categoryId: v.id("catalogCategories"),
    name: v.string(),
    slug: v.string(),
    description: v.string(),
    basePriceCents: v.number(),
    currency: v.string(),
    status: productStatusValidator,
    sku: v.union(v.string(), v.null()),
    imageUrl: v.union(v.string(), v.null()),
    cloudinaryPublicId: v.union(v.string(), v.null()),
    cloudinaryAssetFolder: v.union(v.string(), v.null()),
    sortOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_createdAt", ["createdAt"])
    .index("by_categoryId_and_status", ["categoryId", "status"])
    .index("by_categoryId_and_status_and_sortOrder", [
      "categoryId",
      "status",
      "sortOrder",
    ])
    .index("by_status_and_createdAt", ["status", "createdAt"]),

  productImages: defineTable({
    productId: v.id("products"),
    imageUrl: v.string(),
    cloudinaryPublicId: v.union(v.string(), v.null()),
    cloudinaryAssetFolder: v.union(v.string(), v.null()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_productId_and_sortOrder", ["productId", "sortOrder"]),

  productOptions: defineTable({
    productId: v.id("products"),
    templateId: v.optional(v.id("productOptionTemplates")),
    label: v.string(),
    key: v.string(),
    isRequired: v.boolean(),
    priceDeltaCents: v.number(),
    sortOrder: v.number(),
    config: productOptionConfigValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_productId_and_sortOrder", ["productId", "sortOrder"])
    .index("by_productId_and_key", ["productId", "key"])
    .index("by_templateId", ["templateId"]),

  productOptionTemplates: defineTable({
    kind: productOptionTemplateKindValidator,
    label: v.string(),
    key: v.string(),
    isRequired: v.boolean(),
    priceDeltaCents: v.number(),
    sortOrder: v.number(),
    isActive: v.boolean(),
    config: productOptionConfigValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sortOrder", ["sortOrder"])
    .index("by_key", ["key"]),

  productMetadata: defineTable({
    productId: v.id("products"),
    label: v.string(),
    key: v.string(),
    type: productMetadataTypeValidator,
    value: v.string(),
    linkUrl: v.optional(v.union(v.string(), v.null())),
    showOnProductPage: v.optional(v.boolean()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_productId_and_sortOrder", ["productId", "sortOrder"])
    .index("by_productId_and_key", ["productId", "key"]),

  wishlistItems: defineTable({
    userTokenIdentifier: v.string(),
    productId: v.id("products"),
    productName: v.string(),
    productSlug: v.string(),
    imageUrl: v.union(v.string(), v.null()),
    basePriceCents: v.number(),
    currency: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userTokenIdentifier_and_productId", [
      "userTokenIdentifier",
      "productId",
    ])
    .index("by_userTokenIdentifier_and_createdAt", [
      "userTokenIdentifier",
      "createdAt",
    ]),

  cartItems: defineTable({
    userTokenIdentifier: v.string(),
    productId: v.id("products"),
    configurationKey: v.string(),
    configurationSummary: cartConfigurationSummaryValidator,
    productName: v.string(),
    productSlug: v.string(),
    imageUrl: v.union(v.string(), v.null()),
    unitPriceCents: v.number(),
    currency: v.string(),
    quantity: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userTokenIdentifier_and_configurationKey", [
      "userTokenIdentifier",
      "configurationKey",
    ])
    .index("by_userTokenIdentifier_and_updatedAt", [
      "userTokenIdentifier",
      "updatedAt",
    ]),

  checkoutOrders: defineTable({
    commandId: v.optional(v.string()),
    userTokenIdentifier: v.string(),
    status: checkoutOrderStatusValidator,
    fulfillmentStatus: v.optional(checkoutFulfillmentStatusValidator),
    stripeCheckoutSessionId: v.optional(v.string()),
    stripeCustomerId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    stripePaymentStatus: v.optional(v.string()),
    customerEmail: v.optional(v.union(v.string(), v.null())),
    customerPhone: v.optional(v.union(v.string(), v.null())),
    shippingName: v.optional(v.union(v.string(), v.null())),
    shippingAddress: v.optional(
      v.union(checkoutShippingAddressValidator, v.null())
    ),
    trackingNumber: v.optional(v.union(v.string(), v.null())),
    trackingUrl: v.optional(v.union(v.string(), v.null())),
    dropId: v.optional(v.union(v.string(), v.null())),
    trackId: v.optional(v.union(v.string(), v.null())),
    amountTotalCents: v.number(),
    currency: v.string(),
    productCount: v.number(),
    failureReason: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_userTokenIdentifier_and_createdAt", [
      "userTokenIdentifier",
      "createdAt",
    ])
    .index("by_status_and_createdAt", ["status", "createdAt"])
    .index("by_createdAt", ["createdAt"])
    .index("by_commandId", ["commandId"])
    .index("by_stripeCheckoutSessionId", ["stripeCheckoutSessionId"])
    .index("by_stripePaymentIntentId", ["stripePaymentIntentId"])
    .index("by_fulfillmentStatus_and_createdAt", [
      "fulfillmentStatus",
      "createdAt",
    ]),

  checkoutOrderItems: defineTable({
    orderId: v.id("checkoutOrders"),
    productId: v.id("products"),
    configurationKey: v.string(),
    configurationSummary: cartConfigurationSummaryValidator,
    productName: v.string(),
    productSlug: v.string(),
    imageUrl: v.union(v.string(), v.null()),
    unitPriceCents: v.number(),
    currency: v.string(),
    quantity: v.number(),
    createdAt: v.number(),
  }).index("by_orderId", ["orderId"]),
})
