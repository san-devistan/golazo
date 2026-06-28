import { v, type Infer } from "convex/values"

export const BASE_CURRENCY = "EUR"
const DEFAULT_EUR_TO_USD_RATE = 1.1
const FRANKFURTER_EUR_TO_USD_URL =
  "https://api.frankfurter.dev/v2/rates?quotes=USD"

export const checkoutCurrencyValidator = v.union(
  v.literal("EUR"),
  v.literal("USD")
)

export type CheckoutCurrency = Infer<typeof checkoutCurrencyValidator>

type FrankfurterRate = {
  base: string
  quote: string
  rate: number
}

function positiveRate(value: number) {
  return Number.isFinite(value) && value > 0 ? value : null
}

function configuredEurToUsdRate() {
  const configuredRate = Number.parseFloat(process.env.EUR_TO_USD_RATE ?? "")

  return positiveRate(configuredRate)
}

function parseFrankfurterRate(value: unknown) {
  if (!Array.isArray(value)) {
    return null
  }

  const rate = value.find(
    (item): item is FrankfurterRate =>
      typeof item === "object" &&
      item !== null &&
      "base" in item &&
      "quote" in item &&
      "rate" in item &&
      item.base === BASE_CURRENCY &&
      item.quote === "USD" &&
      typeof item.rate === "number"
  )?.rate

  return rate === undefined ? null : positiveRate(rate)
}

export function normalizeCheckoutCurrency(
  value: CheckoutCurrency | undefined
): CheckoutCurrency {
  return value ?? BASE_CURRENCY
}

export async function resolveEurToUsdRate() {
  try {
    const response = await fetch(FRANKFURTER_EUR_TO_USD_URL)

    if (response.ok) {
      const rate = parseFrankfurterRate(await response.json())

      if (rate !== null) {
        return rate
      }
    }
  } catch {
    // Fall through to configured/default rates.
  }

  return configuredEurToUsdRate() ?? DEFAULT_EUR_TO_USD_RATE
}

export function convertFromEurCents({
  amountCents,
  eurToUsdRate,
  targetCurrency,
}: {
  amountCents: number
  eurToUsdRate: number
  targetCurrency: CheckoutCurrency
}) {
  if (targetCurrency === BASE_CURRENCY) {
    return amountCents
  }

  const rate = positiveRate(eurToUsdRate) ?? DEFAULT_EUR_TO_USD_RATE

  return Math.round(amountCents * rate)
}
