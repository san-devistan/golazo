import { v } from "convex/values"

export const productStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived")
)

export const categoryKindValidator = v.union(
  v.literal("collection"),
  v.literal("group")
)

export const checkoutOrderStatusValidator = v.union(
  v.literal("pending"),
  v.literal("open"),
  v.literal("processing"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("expired")
)

export const checkoutFulfillmentStatusValidator = v.union(
  v.literal("unfulfilled"),
  v.literal("preparing"),
  v.literal("shipped"),
  v.literal("delivered"),
  v.literal("cancelled"),
  v.literal("refunded")
)

export const checkoutShippingAddressValidator = v.object({
  line1: v.union(v.string(), v.null()),
  line2: v.union(v.string(), v.null()),
  city: v.union(v.string(), v.null()),
  state: v.union(v.string(), v.null()),
  postalCode: v.union(v.string(), v.null()),
  country: v.union(v.string(), v.null()),
})

export const optionFieldInputTypeValidator = v.union(
  v.literal("text"),
  v.literal("number")
)

export const productOptionConfigValidator = v.union(
  v.object({
    type: v.literal("choice"),
    choices: v.array(
      v.object({
        label: v.string(),
        value: v.string(),
        priceDeltaCents: v.number(),
      })
    ),
  }),
  v.object({
    type: v.literal("personalization"),
    fields: v.array(
      v.object({
        key: v.string(),
        label: v.string(),
        inputType: optionFieldInputTypeValidator,
        required: v.boolean(),
      })
    ),
  })
)

export const productMetadataTypeValidator = v.union(
  v.literal("text"),
  v.literal("number"),
  v.literal("boolean"),
  v.literal("link")
)

export const productOptionTemplateKindValidator = v.union(
  v.literal("choice"),
  v.literal("personalization")
)

export const cartConfigurationSummaryValidator = v.array(
  v.object({
    label: v.string(),
    value: v.string(),
  })
)

export const productOptionWriteValidator = v.object({
  optionId: v.union(v.id("productOptions"), v.null()),
  templateId: v.union(v.id("productOptionTemplates"), v.null()),
  label: v.string(),
  key: v.string(),
  isRequired: v.boolean(),
  priceDeltaCents: v.number(),
  sortOrder: v.number(),
  config: productOptionConfigValidator,
})

export const productMetadataWriteValidator = v.object({
  metadataId: v.union(v.id("productMetadata"), v.null()),
  label: v.string(),
  key: v.optional(v.string()),
  type: v.optional(productMetadataTypeValidator),
  value: v.string(),
  linkUrl: v.optional(v.union(v.string(), v.null())),
  showOnProductPage: v.optional(v.boolean()),
  sortOrder: v.number(),
})

export const productImageWriteValidator = v.object({
  imageId: v.union(v.id("productImages"), v.null()),
  imageUrl: v.string(),
  cloudinaryPublicId: v.union(v.string(), v.null()),
  cloudinaryAssetFolder: v.union(v.string(), v.null()),
  sortOrder: v.number(),
})

export const productUpsertArgsValidator = {
  productId: v.union(v.id("products"), v.null()),
  categoryId: v.id("catalogCategories"),
  name: v.string(),
  description: v.string(),
  basePriceCents: v.number(),
  currency: v.string(),
  status: productStatusValidator,
  sku: v.union(v.string(), v.null()),
  cloudinaryAssetFolder: v.union(v.string(), v.null()),
  sortOrder: v.number(),
  images: v.array(productImageWriteValidator),
  options: v.array(productOptionWriteValidator),
  metadata: v.array(productMetadataWriteValidator),
}

export const productOptionTemplateWriteValidator = v.object({
  templateId: v.union(v.id("productOptionTemplates"), v.null()),
  kind: productOptionTemplateKindValidator,
  label: v.string(),
  isRequired: v.boolean(),
  priceDeltaCents: v.number(),
  sortOrder: v.number(),
  isActive: v.boolean(),
  choices: v.array(v.string()),
  fields: v.array(v.string()),
})
