import type {
  CartConfigurationSummaryItem,
  CustomerCartItem,
  CustomerWishlistItem,
  ProductId,
} from "@/lib/customer-state"

export const CUSTOMER_STORAGE_KEY = "golazo.customer-state.v1"

export type LocalCustomerState = {
  wishlistItems: Array<CustomerWishlistItem>
  cartItems: Array<CustomerCartItem>
}

export const EMPTY_LOCAL_STATE: LocalCustomerState = {
  wishlistItems: [],
  cartItems: [],
}

export function emptyLocalState(state: LocalCustomerState) {
  return state.wishlistItems.length === 0 && state.cartItems.length === 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

function isCustomerProductId(value: unknown): value is ProductId {
  return typeof value === "string" && value.length > 0
}

function isCartConfigurationSummaryItem(
  value: unknown
): value is CartConfigurationSummaryItem {
  return (
    isRecord(value) &&
    typeof value.label === "string" &&
    typeof value.value === "string"
  )
}

function isCustomerWishlistItem(value: unknown): value is CustomerWishlistItem {
  return (
    isRecord(value) &&
    isCustomerProductId(value.productId) &&
    typeof value.productName === "string" &&
    typeof value.productSlug === "string" &&
    isNullableString(value.imageUrl) &&
    typeof value.basePriceCents === "number" &&
    typeof value.currency === "string"
  )
}

function isCustomerCartItem(value: unknown): value is CustomerCartItem {
  return (
    isRecord(value) &&
    isCustomerProductId(value.productId) &&
    typeof value.configurationKey === "string" &&
    Array.isArray(value.configurationSummary) &&
    value.configurationSummary.every(isCartConfigurationSummaryItem) &&
    typeof value.productName === "string" &&
    typeof value.productSlug === "string" &&
    isNullableString(value.imageUrl) &&
    typeof value.unitPriceCents === "number" &&
    typeof value.currency === "string" &&
    typeof value.quantity === "number"
  )
}

export function parseLocalState(value: string | null): LocalCustomerState {
  if (!value) {
    return EMPTY_LOCAL_STATE
  }

  try {
    const parsedValue: unknown = JSON.parse(value)

    if (!isRecord(parsedValue)) {
      return EMPTY_LOCAL_STATE
    }

    return {
      wishlistItems: Array.isArray(parsedValue.wishlistItems)
        ? parsedValue.wishlistItems.filter(isCustomerWishlistItem)
        : [],
      cartItems: Array.isArray(parsedValue.cartItems)
        ? parsedValue.cartItems.filter(isCustomerCartItem)
        : [],
    }
  } catch {
    return EMPTY_LOCAL_STATE
  }
}

export function readLocalState() {
  if (typeof window === "undefined") {
    return EMPTY_LOCAL_STATE
  }

  return parseLocalState(window.localStorage.getItem(CUSTOMER_STORAGE_KEY))
}

export function writeLocalState(state: LocalCustomerState) {
  if (typeof window === "undefined") {
    return
  }

  if (emptyLocalState(state)) {
    window.localStorage.removeItem(CUSTOMER_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(state))
}
