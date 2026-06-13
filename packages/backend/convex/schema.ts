import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

import {
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
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_productId_and_sortOrder", ["productId", "sortOrder"])
    .index("by_productId_and_key", ["productId", "key"]),
})
