import type { CustomerCartItem, ProductId } from "@/lib/customer-state"
import type { LocalCustomerState } from "@/lib/customer-state-storage"

type AnonymousCartItemMergeInput = Pick<
  CustomerCartItem,
  | "productId"
  | "configurationKey"
  | "configurationSummary"
  | "unitPriceCents"
  | "quantity"
>

export type AnonymousStateMergeInput = {
  wishlistProductIds: Array<ProductId>
  cartItems: Array<AnonymousCartItemMergeInput>
}

export type AnonymousStateMergeClaim = {
  stateKey: string
  mergeKey: string
}

let anonymousStateMergeKey: string | null = null

export function anonymousStateMergeInput(
  state: LocalCustomerState
): AnonymousStateMergeInput {
  return {
    wishlistProductIds: state.wishlistItems.map((item) => item.productId),
    cartItems: state.cartItems.map((item) => ({
      productId: item.productId,
      configurationKey: item.configurationKey,
      configurationSummary: item.configurationSummary,
      unitPriceCents: item.unitPriceCents,
      quantity: item.quantity,
    })),
  }
}

function serializeAnonymousStateMergeInput(input: AnonymousStateMergeInput) {
  return JSON.stringify(input)
}

export function claimAnonymousStateMerge(
  userId: string,
  input: AnonymousStateMergeInput
): AnonymousStateMergeClaim | null {
  const stateKey = serializeAnonymousStateMergeInput(input)
  const mergeKey = JSON.stringify([userId, stateKey])

  if (anonymousStateMergeKey === mergeKey) {
    return null
  }

  anonymousStateMergeKey = mergeKey

  return { stateKey, mergeKey }
}

export function localStateMatchesAnonymousStateMergeKey(
  state: LocalCustomerState,
  stateKey: string
) {
  return (
    serializeAnonymousStateMergeInput(anonymousStateMergeInput(state)) ===
    stateKey
  )
}

export function releaseAnonymousStateMerge(mergeKey: string) {
  if (anonymousStateMergeKey === mergeKey) {
    anonymousStateMergeKey = null
  }
}
