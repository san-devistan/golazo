import { v } from "convex/values"

import type { Id } from "./_generated/dataModel.d.ts"
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server"
import { priceCartProductConfiguration } from "./cartPricing"
import { cartConfigurationSummaryValidator } from "./shopValidators"

const MAX_CART_QUANTITY = 99
const MAX_SYNC_ITEMS = 100

type ProductSnapshot = {
  productName: string
  productSlug: string
  imageUrl: string | null
  basePriceCents: number
  currency: string
}

async function viewerTokenIdentifier(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity()

  return identity?.tokenIdentifier ?? null
}

async function requireViewerTokenIdentifier(ctx: QueryCtx | MutationCtx) {
  const tokenIdentifier = await viewerTokenIdentifier(ctx)

  if (!tokenIdentifier) {
    throw new Error("Sign in to save this action.")
  }

  return tokenIdentifier
}

async function productSnapshot(
  ctx: QueryCtx | MutationCtx,
  productId: Id<"products">
): Promise<ProductSnapshot | null> {
  const product = await ctx.db.get(productId)

  if (!product) {
    return null
  }

  return {
    productName: product.name,
    productSlug: product.slug,
    imageUrl: product.imageUrl,
    basePriceCents: product.basePriceCents,
    currency: product.currency,
  }
}

function normalizeQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    throw new Error("Quantity must be at least 1.")
  }

  return Math.min(quantity, MAX_CART_QUANTITY)
}

function normalizeConfigurationKey(configurationKey: string) {
  const normalizedKey = configurationKey.trim()

  if (!normalizedKey) {
    throw new Error("Cart item configuration is missing.")
  }

  return normalizedKey
}

export const getViewerState = query({
  args: {},
  handler: async (ctx) => {
    const userTokenIdentifier = await viewerTokenIdentifier(ctx)

    if (!userTokenIdentifier) {
      return null
    }

    const [wishlistItems, cartItems] = await Promise.all([
      ctx.db
        .query("wishlistItems")
        .withIndex("by_userTokenIdentifier_and_createdAt", (q) =>
          q.eq("userTokenIdentifier", userTokenIdentifier)
        )
        .order("desc")
        .take(200),
      ctx.db
        .query("cartItems")
        .withIndex("by_userTokenIdentifier_and_updatedAt", (q) =>
          q.eq("userTokenIdentifier", userTokenIdentifier)
        )
        .order("desc")
        .take(200),
    ])

    return {
      wishlistItems,
      wishlistProductIds: wishlistItems.map((item) => item.productId),
      wishlistCount: wishlistItems.length,
      cartItems,
      cartCount: cartItems.reduce((total, item) => total + item.quantity, 0),
    }
  },
})

export const setWishlistItem = mutation({
  args: {
    productId: v.id("products"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userTokenIdentifier = await requireViewerTokenIdentifier(ctx)
    const existingItem = await ctx.db
      .query("wishlistItems")
      .withIndex("by_userTokenIdentifier_and_productId", (q) =>
        q
          .eq("userTokenIdentifier", userTokenIdentifier)
          .eq("productId", args.productId)
      )
      .unique()

    if (!args.enabled) {
      if (existingItem) {
        await ctx.db.delete(existingItem._id)
      }

      return null
    }

    const snapshot = await productSnapshot(ctx, args.productId)

    if (!snapshot) {
      throw new Error("Product no longer exists.")
    }

    const now = Date.now()

    if (existingItem) {
      await ctx.db.patch(existingItem._id, {
        ...snapshot,
        updatedAt: now,
      })
      return existingItem._id
    }

    return await ctx.db.insert("wishlistItems", {
      userTokenIdentifier,
      productId: args.productId,
      ...snapshot,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const addCartItem = mutation({
  args: {
    productId: v.id("products"),
    configurationKey: v.string(),
    configurationSummary: cartConfigurationSummaryValidator,
    unitPriceCents: v.number(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const userTokenIdentifier = await requireViewerTokenIdentifier(ctx)
    const configurationKey = normalizeConfigurationKey(args.configurationKey)
    const quantity = normalizeQuantity(args.quantity)
    const pricedProduct = await priceCartProductConfiguration(
      ctx,
      args.productId,
      args.configurationSummary
    )

    const existingItem = await ctx.db
      .query("cartItems")
      .withIndex("by_userTokenIdentifier_and_configurationKey", (q) =>
        q
          .eq("userTokenIdentifier", userTokenIdentifier)
          .eq("configurationKey", configurationKey)
      )
      .unique()
    const now = Date.now()

    if (existingItem) {
      await ctx.db.patch(existingItem._id, {
        configurationSummary: pricedProduct.configurationSummary,
        productName: pricedProduct.productName,
        productSlug: pricedProduct.productSlug,
        imageUrl: pricedProduct.imageUrl,
        unitPriceCents: pricedProduct.unitPriceCents,
        currency: pricedProduct.currency,
        quantity: normalizeQuantity(existingItem.quantity + quantity),
        updatedAt: now,
      })
      return existingItem._id
    }

    return await ctx.db.insert("cartItems", {
      userTokenIdentifier,
      productId: args.productId,
      configurationKey,
      configurationSummary: pricedProduct.configurationSummary,
      productName: pricedProduct.productName,
      productSlug: pricedProduct.productSlug,
      imageUrl: pricedProduct.imageUrl,
      unitPriceCents: pricedProduct.unitPriceCents,
      currency: pricedProduct.currency,
      quantity,
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const setCartItemQuantity = mutation({
  args: {
    configurationKey: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    const userTokenIdentifier = await requireViewerTokenIdentifier(ctx)
    const configurationKey = normalizeConfigurationKey(args.configurationKey)
    const existingItem = await ctx.db
      .query("cartItems")
      .withIndex("by_userTokenIdentifier_and_configurationKey", (q) =>
        q
          .eq("userTokenIdentifier", userTokenIdentifier)
          .eq("configurationKey", configurationKey)
      )
      .unique()

    if (!existingItem) {
      return null
    }

    if (args.quantity <= 0) {
      await ctx.db.delete(existingItem._id)
      return null
    }

    await ctx.db.patch(existingItem._id, {
      quantity: normalizeQuantity(args.quantity),
      updatedAt: Date.now(),
    })

    return existingItem._id
  },
})

export const removeCartItem = mutation({
  args: {
    configurationKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userTokenIdentifier = await requireViewerTokenIdentifier(ctx)
    const configurationKey = normalizeConfigurationKey(args.configurationKey)
    const existingItem = await ctx.db
      .query("cartItems")
      .withIndex("by_userTokenIdentifier_and_configurationKey", (q) =>
        q
          .eq("userTokenIdentifier", userTokenIdentifier)
          .eq("configurationKey", configurationKey)
      )
      .unique()

    if (existingItem) {
      await ctx.db.delete(existingItem._id)
    }

    return null
  },
})

export const mergeAnonymousState = mutation({
  args: {
    wishlistProductIds: v.array(v.id("products")),
    cartItems: v.array(
      v.object({
        productId: v.id("products"),
        configurationKey: v.string(),
        configurationSummary: cartConfigurationSummaryValidator,
        unitPriceCents: v.number(),
        quantity: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userTokenIdentifier = await requireViewerTokenIdentifier(ctx)
    const now = Date.now()

    for (const productId of args.wishlistProductIds.slice(0, MAX_SYNC_ITEMS)) {
      const existingItem = await ctx.db
        .query("wishlistItems")
        .withIndex("by_userTokenIdentifier_and_productId", (q) =>
          q
            .eq("userTokenIdentifier", userTokenIdentifier)
            .eq("productId", productId)
        )
        .unique()

      if (existingItem) {
        continue
      }

      const snapshot = await productSnapshot(ctx, productId)

      if (!snapshot) {
        continue
      }

      await ctx.db.insert("wishlistItems", {
        userTokenIdentifier,
        productId,
        ...snapshot,
        createdAt: now,
        updatedAt: now,
      })
    }

    for (const item of args.cartItems.slice(0, MAX_SYNC_ITEMS)) {
      const configurationKey = normalizeConfigurationKey(item.configurationKey)
      const quantity = normalizeQuantity(item.quantity)
      let pricedProduct: Awaited<
        ReturnType<typeof priceCartProductConfiguration>
      >

      try {
        pricedProduct = await priceCartProductConfiguration(
          ctx,
          item.productId,
          item.configurationSummary
        )
      } catch {
        continue
      }

      const existingItem = await ctx.db
        .query("cartItems")
        .withIndex("by_userTokenIdentifier_and_configurationKey", (q) =>
          q
            .eq("userTokenIdentifier", userTokenIdentifier)
            .eq("configurationKey", configurationKey)
        )
        .unique()

      if (existingItem) {
        await ctx.db.patch(existingItem._id, {
          configurationSummary: pricedProduct.configurationSummary,
          productName: pricedProduct.productName,
          productSlug: pricedProduct.productSlug,
          imageUrl: pricedProduct.imageUrl,
          unitPriceCents: pricedProduct.unitPriceCents,
          currency: pricedProduct.currency,
          quantity: normalizeQuantity(existingItem.quantity + quantity),
          updatedAt: now,
        })
        continue
      }

      await ctx.db.insert("cartItems", {
        userTokenIdentifier,
        productId: item.productId,
        configurationKey,
        configurationSummary: pricedProduct.configurationSummary,
        productName: pricedProduct.productName,
        productSlug: pricedProduct.productSlug,
        imageUrl: pricedProduct.imageUrl,
        unitPriceCents: pricedProduct.unitPriceCents,
        currency: pricedProduct.currency,
        quantity,
        createdAt: now,
        updatedAt: now,
      })
    }

    return null
  },
})
