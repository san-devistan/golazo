import { LOCALE_OPTIONS } from "@/lib/i18n"
import { CURRENCY_OPTIONS, currencyOption } from "@/lib/money"
import { useAppPreferences } from "@/lib/preferences"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"
import { ChevronDownIcon, LanguagesIcon } from "lucide-react"
import { useCallback, type ReactNode } from "react"

export function LocaleCurrencySwitcher() {
  const { currency, locale, t } = useAppPreferences()
  const selectedCurrency = currencyOption(currency)
  const selectedLocale = LOCALE_OPTIONS.find((option) => option.code === locale)

  return (
    <Popover>
      <PopoverTrigger
        type="button"
        aria-label={t("preferencesLabel")}
        className="inline-flex h-[34px] shrink-0 items-center gap-1.5 bg-transparent px-1 text-[0.8125rem] whitespace-nowrap text-[#111] transition hover:opacity-65 focus-visible:ring-2 focus-visible:ring-[#111]/30 focus-visible:outline-none"
      >
        <LanguagesIcon className="size-[17px]" />
        <span>
          {selectedLocale?.shortLabel ?? locale.toUpperCase()}/
          {selectedCurrency.code}
        </span>
        <ChevronDownIcon className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-72 rounded-none border border-[#d9d9d9] bg-white p-3 text-[#111] shadow-lg ring-0"
      >
        <PreferenceSection title={t("language")}>
          <div className="grid grid-cols-2 gap-2">
            {LOCALE_OPTIONS.map((option) => (
              <LocalePreferenceButton key={option.code} option={option} />
            ))}
          </div>
        </PreferenceSection>

        <PreferenceSection title={t("currency")}>
          <div className="grid grid-cols-2 gap-2">
            {CURRENCY_OPTIONS.map((option) => (
              <CurrencyPreferenceButton key={option.code} option={option} />
            ))}
          </div>
        </PreferenceSection>
      </PopoverContent>
    </Popover>
  )
}

function LocalePreferenceButton({
  option,
}: {
  option: (typeof LOCALE_OPTIONS)[number]
}) {
  const { locale, setLocale } = useAppPreferences()
  const handleClick = useCallback(() => {
    setLocale(option.code)
  }, [option.code, setLocale])

  return (
    <PreferenceButton active={option.code === locale} onClick={handleClick}>
      {option.label}
    </PreferenceButton>
  )
}

function CurrencyPreferenceButton({
  option,
}: {
  option: (typeof CURRENCY_OPTIONS)[number]
}) {
  const { currency, setCurrency } = useAppPreferences()
  const handleClick = useCallback(() => {
    setCurrency(option.code)
  }, [option.code, setCurrency])

  return (
    <PreferenceButton active={option.code === currency} onClick={handleClick}>
      <span>{option.code}</span>
      <span className="text-muted-foreground">{option.symbol}</span>
    </PreferenceButton>
  )
}

function PreferenceSection({
  children,
  title,
}: {
  children: ReactNode
  title: string
}) {
  return (
    <section className="grid gap-2">
      <h2 className="text-xs font-black tracking-wide uppercase">{title}</h2>
      {children}
    </section>
  )
}

function PreferenceButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 border border-[#d9d9d9] bg-white px-2 text-xs font-bold transition hover:border-[#111] focus-visible:ring-2 focus-visible:ring-[#111]/30 focus-visible:outline-none",
        active && "border-[#111] bg-[#111] text-white hover:bg-[#111]"
      )}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
