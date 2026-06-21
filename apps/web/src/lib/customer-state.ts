import { authClient } from "@/lib/auth-client"
import { api } from "@workspace/backend/api"
import { useAction, useMutation, useQuery } from "convex/react"
import type { GenericId } from "convex/values"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react"

const CUSTOMER_STORAGE_KEY = "golazo.customer-state.v1"
const MAX_CART_QUANTITY = 99

export type ProductId = GenericId<"products">

export type CustomerProductSnapshot = {
  productId: ProductId
  name: string
  slug: string
  imageUrl: string | null
  basePriceCents: number
  currency: string
}

export type CartConfigurationSummaryItem = {
  label: string
  value: string
}

export type CustomerWishlistItem = {
  productId: ProductId
  productName: string
  productSlug: string
  imageUrl: string | null
  basePriceCents: number
  currency: string
}

export type CustomerCartItem = {
  productId: ProductId
  configurationKey: string
  configurationSummary: Array<CartConfigurationSummaryItem>
  productName: string
  productSlug: string
  imageUrl: string | null
  unitPriceCents: number
  currency: string
  quantity: number
}

export type AddCartItemInput = {
  product: CustomerProductSnapshot
  configurationKey: string
  configurationSummary: Array<CartConfigurationSummaryItem>
  unitPriceCents: number
  quantity: number
}

type LocalCustomerState = {
  wishlistItems: Array<CustomerWishlistItem>
  cartItems: Array<CustomerCartItem>
}

const EMPTY_LOCAL_STATE: LocalCustomerState = {
  wishlistItems: [],
  cartItems: [],
}

let localStateCache = EMPTY_LOCAL_STATE
let hasHydratedLocalState = false
let isListeningToStorage = false
const localStateListeners = new Set<() => void>()

export function cartConfigurationKey(
  productId: ProductId,
  configurationSummary: Array<CartConfigurationSummaryItem>
) {
  return `${productId}:${JSON.stringify(configurationSummary)}`
}

function clampQuantity(quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return 1
  }

  return Math.min(quantity, MAX_CART_QUANTITY)
}

function emptyLocalState(state: LocalCustomerState) {
  return state.wishlistItems.length === 0 && state.cartItems.length === 0
}

function parseLocalState(value: string | null): LocalCustomerState {
  if (!value) {
    return EMPTY_LOCAL_STATE
  }

  try {
    const parsedValue = JSON.parse(value) as Partial<LocalCustomerState>

    return {
      wishlistItems: Array.isArray(parsedValue.wishlistItems)
        ? parsedValue.wishlistItems
        : [],
      cartItems: Array.isArray(parsedValue.cartItems)
        ? parsedValue.cartItems
        : [],
    }
  } catch {
    return EMPTY_LOCAL_STATE
  }
}

function readLocalState() {
  if (typeof window === "undefined") {
    return EMPTY_LOCAL_STATE
  }

  return parseLocalState(window.localStorage.getItem(CUSTOMER_STORAGE_KEY))
}

function writeLocalState(state: LocalCustomerState) {
  if (typeof window === "undefined") {
    return
  }

  if (emptyLocalState(state)) {
    window.localStorage.removeItem(CUSTOMER_STORAGE_KEY)
    return
  }

  window.localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(state))
}

function getLocalStateSnapshot() {
  if (typeof window === "undefined") {
    return EMPTY_LOCAL_STATE
  }

  if (!hasHydratedLocalState) {
    localStateCache = readLocalState()
    hasHydratedLocalState = true
  }

  return localStateCache
}

function emitLocalStateChange() {
  for (const listener of localStateListeners) {
    listener()
  }
}

function setLocalCustomerState(
  updater: (state: LocalCustomerState) => LocalCustomerState
) {
  localStateCache = updater(getLocalStateSnapshot())
  hasHydratedLocalState = true
  writeLocalState(localStateCache)
  emitLocalStateChange()
}

function subscribeToLocalState(listener: () => void) {
  localStateListeners.add(listener)

  if (typeof window !== "undefined" && !isListeningToStorage) {
    isListeningToStorage = true
    window.addEventListener("storage", (event) => {
      if (event.key !== CUSTOMER_STORAGE_KEY) {
        return
      }

      localStateCache = parseLocalState(event.newValue)
      hasHydratedLocalState = true
      emitLocalStateChange()
    })
  }

  return () => {
    localStateListeners.delete(listener)
  }
}

function useLocalCustomerState() {
  return useSyncExternalStore(
    subscribeToLocalState,
    getLocalStateSnapshot,
    () => EMPTY_LOCAL_STATE
  )
}

function addLocalCartItem(state: LocalCustomerState, input: AddCartItemInput) {
  const existingItem = state.cartItems.find(
    (item) => item.configurationKey === input.configurationKey
  )

  if (existingItem) {
    return {
      ...state,
      cartItems: state.cartItems.map((item) =>
        item.configurationKey === input.configurationKey
          ? {
              ...item,
              quantity: clampQuantity(item.quantity + input.quantity),
            }
          : item
      ),
    }
  }

  return {
    ...state,
    cartItems: [
      {
        productId: input.product.productId,
        configurationKey: input.configurationKey,
        configurationSummary: input.configurationSummary,
        productName: input.product.name,
        productSlug: input.product.slug,
        imageUrl: input.product.imageUrl,
        unitPriceCents: input.unitPriceCents,
        currency: input.product.currency,
        quantity: clampQuantity(input.quantity),
      },
      ...state.cartItems,
    ],
  }
}

function setLocalCartQuantity(
  state: LocalCustomerState,
  configurationKey: string,
  quantity: number
) {
  if (quantity <= 0) {
    return {
      ...state,
      cartItems: state.cartItems.filter(
        (item) => item.configurationKey !== configurationKey
      ),
    }
  }

  return {
    ...state,
    cartItems: state.cartItems.map((item) =>
      item.configurationKey === configurationKey
        ? { ...item, quantity: clampQuantity(quantity) }
        : item
    ),
  }
}

function toggleLocalWishlistItem(
  state: LocalCustomerState,
  product: CustomerProductSnapshot
) {
  const hasItem = state.wishlistItems.some(
    (item) => item.productId === product.productId
  )

  if (hasItem) {
    return {
      ...state,
      wishlistItems: state.wishlistItems.filter(
        (item) => item.productId !== product.productId
      ),
    }
  }

  return {
    ...state,
    wishlistItems: [
      {
        productId: product.productId,
        productName: product.name,
        productSlug: product.slug,
        imageUrl: product.imageUrl,
        basePriceCents: product.basePriceCents,
        currency: product.currency,
      },
      ...state.wishlistItems,
    ],
  }
}

export function useCustomerState() {
  const session = authClient.useSession()
  const localState = useLocalCustomerState()
  const serverState = useQuery(api.customer.getViewerState)
  const createCartCheckout = useAction(api.checkout.createCartCheckout)
  const setWishlistItem = useMutation(api.customer.setWishlistItem)
  const addServerCartItem = useMutation(api.customer.addCartItem)
  const setServerCartItemQuantity = useMutation(
    api.customer.setCartItemQuantity
  )
  const removeServerCartItem = useMutation(api.customer.removeCartItem)
  const mergeAnonymousState = useMutation(api.customer.mergeAnonymousState)
  const lastMergedUserIdRef = useRef<string | null>(null)
  const isAuthenticated = Boolean(session.data?.session)
  const serverStateReady = serverState !== undefined && serverState !== null
  const shouldUseServerState = isAuthenticated && serverStateReady

  const wishlistItems = shouldUseServerState
    ? serverState.wishlistItems
    : localState.wishlistItems
  const cartItems = shouldUseServerState
    ? serverState.cartItems
    : localState.cartItems
  const wishlistProductIds = useMemo(
    () => new Set(wishlistItems.map((item) => item.productId)),
    [wishlistItems]
  )
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)

  useEffect(() => {
    const userId = session.data?.user.id

    if (
      !isAuthenticated ||
      !serverStateReady ||
      !userId ||
      emptyLocalState(localState) ||
      lastMergedUserIdRef.current === userId
    ) {
      return
    }

    lastMergedUserIdRef.current = userId

    void mergeAnonymousState({
      wishlistProductIds: localState.wishlistItems.map(
        (item) => item.productId
      ),
      cartItems: localState.cartItems.map((item) => ({
        productId: item.productId,
        configurationKey: item.configurationKey,
        configurationSummary: item.configurationSummary,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
      })),
    })
      .then(() => {
        setLocalCustomerState(() => EMPTY_LOCAL_STATE)
        return null
      })
      .catch(() => {
        lastMergedUserIdRef.current = null
      })
  }, [
    isAuthenticated,
    localState,
    mergeAnonymousState,
    serverStateReady,
    session.data?.user.id,
  ])

  const isWishlistProduct = useCallback(
    (productId: ProductId) => wishlistProductIds.has(productId),
    [wishlistProductIds]
  )

  const toggleWishlist = useCallback(
    async (product: CustomerProductSnapshot) => {
      if (isAuthenticated) {
        await setWishlistItem({
          productId: product.productId,
          enabled: !isWishlistProduct(product.productId),
        })
        return
      }

      setLocalCustomerState((state) => toggleLocalWishlistItem(state, product))
    },
    [isAuthenticated, isWishlistProduct, setWishlistItem]
  )

  const addCartItem = useCallback(
    async (input: AddCartItemInput) => {
      if (isAuthenticated) {
        await addServerCartItem({
          productId: input.product.productId,
          configurationKey: input.configurationKey,
          configurationSummary: input.configurationSummary,
          unitPriceCents: input.unitPriceCents,
          quantity: input.quantity,
        })
        return
      }

      setLocalCustomerState((state) => addLocalCartItem(state, input))
    },
    [addServerCartItem, isAuthenticated]
  )

  const setCartItemQuantity = useCallback(
    async (configurationKey: string, quantity: number) => {
      if (isAuthenticated) {
        await setServerCartItemQuantity({ configurationKey, quantity })
        return
      }

      setLocalCustomerState((state) =>
        setLocalCartQuantity(state, configurationKey, quantity)
      )
    },
    [isAuthenticated, setServerCartItemQuantity]
  )

  const removeCartItem = useCallback(
    async (configurationKey: string) => {
      if (isAuthenticated) {
        await removeServerCartItem({ configurationKey })
        return
      }

      setLocalCustomerState((state) =>
        setLocalCartQuantity(state, configurationKey, 0)
      )
    },
    [isAuthenticated, removeServerCartItem]
  )

  const startCheckout = useCallback(async () => {
    if (!isAuthenticated) {
      throw new Error("Sign in to checkout.")
    }

    const cancelPath =
      typeof window === "undefined"
        ? "/"
        : `${window.location.pathname}${window.location.search}`
    const checkout = await createCartCheckout({ cancelPath })

    window.location.assign(checkout.url)
  }, [createCartCheckout, isAuthenticated])

  return {
    cartCount,
    cartItems,
    isAuthenticated,
    isAuthLoading: session.isPending,
    isWishlistProduct,
    wishlistCount: wishlistItems.length,
    wishlistItems,
    addCartItem,
    removeCartItem,
    setCartItemQuantity,
    startCheckout,
    toggleWishlist,
  }
}
