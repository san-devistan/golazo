export const BASE_CURRENCY = "EUR"

const DEFAULT_EUR_TO_USD_RATE = 1.1

export const CURRENCY_OPTIONS = [
  {
    code: "EUR",
    label: "Euro",
    symbol: "€",
  },
  {
    code: "USD",
    label: "US dollar",
    symbol: "$",
  },
] as const

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"]

const CURRENCY_CODES: ReadonlySet<string> = new Set(
  CURRENCY_OPTIONS.map((option) => option.code)
)

function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_CODES.has(value)
}

function normalizedPositiveRate(value: number) {
  return Number.isFinite(value) && value > 0 ? value : null
}

function currencyFractionDigits(currency: string, locale: string) {
  return (
    new Intl.NumberFormat(locale, {
      currency,
      style: "currency",
    }).resolvedOptions().maximumFractionDigits ?? 2
  )
}

export function configuredEurToUsdRate() {
  const configuredRate = Number.parseFloat(
    import.meta.env.VITE_EUR_TO_USD_RATE ?? ""
  )

  return normalizedPositiveRate(configuredRate) ?? DEFAULT_EUR_TO_USD_RATE
}

export function normalizeCurrency(value: string) {
  const normalized = value.trim().toUpperCase()

  return isCurrencyCode(normalized) ? normalized : BASE_CURRENCY
}

export function currencyOption(currency: CurrencyCode) {
  return (
    CURRENCY_OPTIONS.find((option) => option.code === currency) ??
    CURRENCY_OPTIONS[0]
  )
}

export function convertMoneyCents({
  amountCents,
  eurToUsdRate,
  sourceCurrency,
  targetCurrency,
}: {
  amountCents: number
  eurToUsdRate: number
  sourceCurrency: string
  targetCurrency: CurrencyCode
}) {
  const source = normalizeCurrency(sourceCurrency)

  if (source === targetCurrency) {
    return amountCents
  }

  const rate = normalizedPositiveRate(eurToUsdRate) ?? DEFAULT_EUR_TO_USD_RATE
  const eurCents = source === BASE_CURRENCY ? amountCents : amountCents / rate

  return Math.round(
    targetCurrency === BASE_CURRENCY ? eurCents : eurCents * rate
  )
}

export function formatMoney({
  amountCents,
  displayCurrency,
  eurToUsdRate,
  locale,
  sourceCurrency = BASE_CURRENCY,
}: {
  amountCents: number
  displayCurrency: CurrencyCode
  eurToUsdRate: number
  locale: string
  sourceCurrency?: string
}) {
  const convertedCents = convertMoneyCents({
    amountCents,
    eurToUsdRate,
    sourceCurrency,
    targetCurrency: displayCurrency,
  })

  return new Intl.NumberFormat(locale, {
    currency: displayCurrency,
    style: "currency",
  }).format(convertedCents / 100)
}

export function formatExactMoney({
  amountCents,
  currency,
  locale,
}: {
  amountCents: number
  currency: string
  locale: string
}) {
  const normalizedCurrency = currency.toUpperCase()

  return new Intl.NumberFormat(locale, {
    currency: normalizedCurrency,
    style: "currency",
  }).format(
    amountCents / 10 ** currencyFractionDigits(normalizedCurrency, locale)
  )
}
