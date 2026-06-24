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
  formatMoney,
  normalizeCurrency,
  type CurrencyCode,
} from "@/lib/money"
import {
  createContext,
  type ReactNode,
  use,
  useCallback,
  useEffect,
  useMemo,
} from "react"
import { useLocalStorage } from "usehooks-ts"

type AppPreferencesContextValue = {
  locale: AppLocale
  currency: CurrencyCode
  setLocale: (locale: AppLocale) => void
  setCurrency: (currency: CurrencyCode) => void
  t: (key: TranslationKey) => string
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
  const formatPrice = useCallback(
    (amountCents: number, sourceCurrency = BASE_CURRENCY) =>
      formatMoney({
        amountCents,
        displayCurrency: currency,
        locale: currentLocale.intlLocale,
        sourceCurrency,
      }),
    [currency, currentLocale.intlLocale]
  )
  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      currency,
      formatPrice,
      locale,
      setCurrency,
      setLocale,
      t,
    }),
    [currency, formatPrice, locale, setCurrency, setLocale, t]
  )

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  )
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
