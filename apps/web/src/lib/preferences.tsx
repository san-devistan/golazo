import {
  DEFAULT_LOCALE,
  localeOption,
  normalizeLocale,
  translate,
  type AppLocale,
  type TranslationKey,
} from "@/lib/i18n"
import {
  BASE_CURRENCY,
  configuredEurToUsdRate,
  convertMoneyCents,
  formatExactMoney,
  formatMoney,
  normalizeCurrency,
  type CurrencyCode,
} from "@/lib/money"
import { api } from "@workspace/backend/api"
import { useAction } from "convex/react"
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { useLocalStorage } from "usehooks-ts"

const FALLBACK_EUR_TO_USD_RATE = configuredEurToUsdRate()

type AppPreferencesContextValue = {
  locale: AppLocale
  currency: CurrencyCode
  eurToUsdRate: number
  convertPriceCents: (amountCents: number, sourceCurrency?: string) => number
  setLocale: (locale: AppLocale) => void
  setCurrency: (currency: CurrencyCode) => void
  setEurToUsdRate: (eurToUsdRate: number) => void
  t: (key: TranslationKey) => string
  formatExactPrice: (amountCents: number, currency: string) => string
  formatPrice: (amountCents: number, sourceCurrency?: string) => string
}

const AppPreferencesContext = createContext<AppPreferencesContextValue | null>(
  null
)

function storedString(value: string) {
  try {
    const parsed: unknown = JSON.parse(value)

    return typeof parsed === "string" ? parsed : value
  } catch {
    return value
  }
}

function deserializeLocale(value: string) {
  return normalizeLocale(storedString(value))
}

function deserializeCurrency(value: string) {
  return normalizeCurrency(storedString(value))
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const [eurToUsdRate, setEurToUsdRate] = useState(FALLBACK_EUR_TO_USD_RATE)
  const [locale, setLocale] = useLocalStorage<AppLocale>(
    "golazo.locale",
    DEFAULT_LOCALE,
    {
      deserializer: deserializeLocale,
      initializeWithValue: false,
      serializer: (value) => value,
    }
  )
  const [currency, setCurrency] = useLocalStorage<CurrencyCode>(
    "golazo.currency",
    BASE_CURRENCY,
    {
      deserializer: deserializeCurrency,
      initializeWithValue: false,
      serializer: (value) => value,
    }
  )
  const currentLocale = localeOption(locale)

  useEffect(() => {
    document.documentElement.lang = currentLocale.htmlLang
  }, [currentLocale.htmlLang])

  const t = useCallback(
    (key: TranslationKey) => translate(locale, key),
    [locale]
  )
  const convertPriceCents = useCallback(
    (amountCents: number, sourceCurrency = BASE_CURRENCY) =>
      convertMoneyCents({
        amountCents,
        eurToUsdRate,
        sourceCurrency,
        targetCurrency: currency,
      }),
    [currency, eurToUsdRate]
  )
  const formatPrice = useCallback(
    (amountCents: number, sourceCurrency = BASE_CURRENCY) =>
      formatMoney({
        amountCents,
        displayCurrency: currency,
        eurToUsdRate,
        locale: currentLocale.intlLocale,
        sourceCurrency,
      }),
    [currency, currentLocale.intlLocale, eurToUsdRate]
  )
  const formatExactPrice = useCallback(
    (amountCents: number, exactCurrency: string) =>
      formatExactMoney({
        amountCents,
        currency: exactCurrency,
        locale: currentLocale.intlLocale,
      }),
    [currentLocale.intlLocale]
  )
  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      convertPriceCents,
      currency,
      eurToUsdRate,
      formatExactPrice,
      formatPrice,
      locale,
      setCurrency,
      setEurToUsdRate,
      setLocale,
      t,
    }),
    [
      convertPriceCents,
      currency,
      eurToUsdRate,
      formatExactPrice,
      formatPrice,
      locale,
      setCurrency,
      setEurToUsdRate,
      setLocale,
      t,
    ]
  )

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  )
}

export function ServerCurrencyRateLoader() {
  const getCurrencyRates = useAction(api.checkout.getCurrencyRates)
  const { setEurToUsdRate } = useAppPreferences()
  const didLoadRef = useRef(false)

  useEffect(() => {
    if (didLoadRef.current) {
      return
    }

    didLoadRef.current = true

    void getCurrencyRates({})
      .then((rates) => {
        setEurToUsdRate(rates.eurToUsdRate)
        return null
      })
      .catch(() => null)
  }, [getCurrencyRates, setEurToUsdRate])

  return null
}

export function useAppPreferences() {
  const value = use(AppPreferencesContext)

  if (!value) {
    throw new Error(
      "useAppPreferences must be used within AppPreferencesProvider."
    )
  }

  return value
}

export function useTranslation() {
  return useAppPreferences().t
}

export function useMoneyFormatter() {
  return useAppPreferences().formatPrice
}

export function useExactMoneyFormatter() {
  return useAppPreferences().formatExactPrice
}
