import { v } from "convex/values"

export const productStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("archived")
)

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
  v.literal("boolean")
)

export const productOptionTemplateKindValidator = v.union(
  v.literal("choice"),
  v.literal("personalization")
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
  key: v.string(),
  type: productMetadataTypeValidator,
  value: v.string(),
  sortOrder: v.number(),
})

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
