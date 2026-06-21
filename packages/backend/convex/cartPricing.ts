/* eslint-disable complexity -- Pricing follows each persisted product option variant. */

import type { Infer } from "convex/values"

import type { Id } from "./_generated/dataModel.d.ts"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import type { cartConfigurationSummaryValidator } from "./shopValidators"

const PRODUCT_OPTION_LIMIT = 100

export type CartConfigurationSummaryItem = Infer<
  typeof cartConfigurationSummaryValidator
>[number]

export type PricedCartProductSnapshot = {
  productName: string
  productSlug: string
  imageUrl: string | null
  unitPriceCents: number
  currency: string
  configurationSummary: Array<CartConfigurationSummaryItem>
}

function displayOptionLabel(label: string) {
  return label.trim().toLowerCase() === "jersey flocking" ? "Flocking" : label
}

function summaryLabelKey(label: string) {
  return label.trim().toLowerCase()
}

function normalizePriceCents(label: string, value: number) {
  if (!Number.isInteger(value)) {
    throw new Error(`${label} must be an integer amount in cents.`)
  }

  return value
}

function normalizeCartConfigurationSummary(
  summary: Array<CartConfigurationSummaryItem>
) {
  if (summary.length > PRODUCT_OPTION_LIMIT) {
    throw new Error("Cart item has too many options.")
  }

  return summary.map((item) => ({
    label: item.label.trim(),
    value: item.value.trim(),
  }))
}

function summaryByDisplayLabel(summary: Array<CartConfigurationSummaryItem>) {
  const byLabel = new Map<string, CartConfigurationSummaryItem>()

  for (const item of summary) {
    if (!item.label) {
      continue
    }

    byLabel.set(summaryLabelKey(item.label), item)
  }

  return byLabel
}

export async function priceCartProductConfiguration(
  ctx: QueryCtx | MutationCtx,
  productId: Id<"products">,
  configurationSummary: Array<CartConfigurationSummaryItem>
): Promise<PricedCartProductSnapshot> {
  const product = await ctx.db.get(productId)

  if (!product || product.status !== "published") {
    throw new Error("Product is no longer available.")
  }

  const options = await ctx.db
    .query("productOptions")
    .withIndex("by_productId_and_sortOrder", (q) =>
      q.eq("productId", productId)
    )
    .take(PRODUCT_OPTION_LIMIT + 1)

  if (options.length > PRODUCT_OPTION_LIMIT) {
    throw new Error(`Review options for ${product.name}.`)
  }

  const normalizedSummary =
    normalizeCartConfigurationSummary(configurationSummary)
  const byLabel = summaryByDisplayLabel(normalizedSummary)
  const knownLabels = new Set(
    options.map((option) => summaryLabelKey(displayOptionLabel(option.label)))
  )
  let unitPriceCents = normalizePriceCents("Base price", product.basePriceCents)

  for (const item of normalizedSummary) {
    if (item.label && !knownLabels.has(summaryLabelKey(item.label))) {
      throw new Error(`Review options for ${product.name}.`)
    }
  }

  for (const option of options) {
    const optionLabel = displayOptionLabel(option.label)
    const summaryItem = byLabel.get(summaryLabelKey(optionLabel))

    if (option.config.type === "choice") {
      if (!summaryItem) {
        if (option.isRequired) {
          throw new Error(`Choose ${optionLabel}.`)
        }

        continue
      }

      const selectedChoice = option.config.choices.find(
        (choice) => choice.label.trim() === summaryItem.value
      )

      if (!selectedChoice) {
        throw new Error(`Choose a valid ${optionLabel}.`)
      }

      unitPriceCents +=
        normalizePriceCents(optionLabel, option.priceDeltaCents) +
        normalizePriceCents(
          selectedChoice.label,
          selectedChoice.priceDeltaCents
        )
      continue
    }

    if (option.isRequired && !summaryItem) {
      throw new Error(`Enter ${optionLabel}.`)
    }

    if (summaryItem || option.isRequired) {
      unitPriceCents += normalizePriceCents(optionLabel, option.priceDeltaCents)
    }
  }

  if (unitPriceCents < 0) {
    throw new Error(`Price for ${product.name} cannot be negative.`)
  }

  return {
    productName: product.name,
    productSlug: product.slug,
    imageUrl: product.imageUrl,
    unitPriceCents,
    currency: product.currency,
    configurationSummary: normalizedSummary,
  }
}
