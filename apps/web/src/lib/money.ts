export const BASE_CURRENCY = "EUR"

const DEFAULT_EUR_TO_USD_RATE = 1.1

const configuredEurToUsdRate = Number.parseFloat(
  import.meta.env.VITE_EUR_TO_USD_RATE ?? ""
)
const eurToUsdRate =
  Number.isFinite(configuredEurToUsdRate) && configuredEurToUsdRate > 0
    ? configuredEurToUsdRate
    : DEFAULT_EUR_TO_USD_RATE

export const CURRENCY_OPTIONS = [
  {
    code: "EUR",
    label: "Euro",
    symbol: "€",
    rateFromEur: 1,
  },
  {
    code: "USD",
    label: "US dollar",
    symbol: "$",
    rateFromEur: eurToUsdRate,
  },
] as const

export type CurrencyCode = (typeof CURRENCY_OPTIONS)[number]["code"]

const CURRENCY_CODES: ReadonlySet<string> = new Set(
  CURRENCY_OPTIONS.map((option) => option.code)
)

function isCurrencyCode(value: string): value is CurrencyCode {
  return CURRENCY_CODES.has(value)
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

function convertMoneyCents({
  amountCents,
  sourceCurrency,
  targetCurrency,
}: {
  amountCents: number
  sourceCurrency: string
  targetCurrency: CurrencyCode
}) {
  const sourceOption = currencyOption(normalizeCurrency(sourceCurrency))
  const targetOption = currencyOption(targetCurrency)
  const eurCents = amountCents / sourceOption.rateFromEur

  return Math.round(eurCents * targetOption.rateFromEur)
}

export function formatMoney({
  amountCents,
  displayCurrency,
  locale,
  sourceCurrency = BASE_CURRENCY,
}: {
  amountCents: number
  displayCurrency: CurrencyCode
  locale: string
  sourceCurrency?: string
}) {
  const convertedCents = convertMoneyCents({
    amountCents,
    sourceCurrency,
    targetCurrency: displayCurrency,
  })

  return new Intl.NumberFormat(locale, {
    currency: displayCurrency,
    style: "currency",
  }).format(convertedCents / 100)
}
