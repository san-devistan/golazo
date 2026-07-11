import type {
  ChoiceConfig,
  ChoiceProductOption,
} from "@/components/product-detail-types"
import { SizeGuideDialog } from "@/components/size-guide-dialog"
import { useMoneyFormatter } from "@/lib/preferences"
import { cn } from "@workspace/ui/lib/utils"
import { useCallback, type ReactNode } from "react"

const PRODUCT_OPTION_BUTTON_CLASS_NAME =
  "flex min-h-11 min-w-11 cursor-pointer items-center justify-center px-3 text-sm font-semibold transition has-focus-visible:ring-2 has-focus-visible:ring-[#111]/30"

export function ChoiceOptionControl({
  label,
  option,
  showSizeGuide,
  value,
  onChange,
  currency,
}: {
  label: string
  option: ChoiceProductOption
  showSizeGuide: boolean
  value: string
  onChange: (value: string) => void
  currency: string
}) {
  const formatPrice = useMoneyFormatter()

  return (
    <ChoiceOptionLayout label={label} showSizeGuide={showSizeGuide}>
      <ProductOptionButtonGroup>
        {!option.isRequired && (
          <ChoiceNoneOptionButton
            label={label}
            name={option._id}
            checked={value === ""}
            onChange={onChange}
          />
        )}
        {option.config.choices.map((choice) => (
          <ChoiceValueOptionButton
            key={choice.value}
            choice={choice}
            label={label}
            name={option._id}
            required={option.isRequired}
            checked={value === choice.value}
            price={formatPrice(choice.priceDeltaCents, currency)}
            onChange={onChange}
          />
        ))}
      </ProductOptionButtonGroup>
    </ChoiceOptionLayout>
  )
}

function ChoiceNoneOptionButton({
  checked,
  label,
  name,
  onChange,
}: {
  checked: boolean
  label: string
  name: string
  onChange: (value: string) => void
}) {
  const handleChange = useCallback(() => {
    onChange("")
  }, [onChange])

  return (
    <label
      className={cn(
        PRODUCT_OPTION_BUTTON_CLASS_NAME,
        checked
          ? "bg-foreground text-background"
          : "bg-[#eef1f3] text-foreground hover:bg-black/10"
      )}
    >
      <input
        type="radio"
        aria-label={`No ${label}`}
        name={name}
        value=""
        checked={checked}
        onChange={handleChange}
        className="sr-only"
      />
      None
    </label>
  )
}

function ChoiceValueOptionButton({
  checked,
  choice,
  label,
  name,
  price,
  required,
  onChange,
}: {
  checked: boolean
  choice: ChoiceConfig["choices"][number]
  label: string
  name: string
  price: string
  required: boolean
  onChange: (value: string) => void
}) {
  const handleChange = useCallback(() => {
    onChange(choice.value)
  }, [choice.value, onChange])

  return (
    <label
      className={cn(
        PRODUCT_OPTION_BUTTON_CLASS_NAME,
        checked
          ? "bg-foreground text-background"
          : "bg-[#eef1f3] text-foreground hover:bg-black/10"
      )}
    >
      <input
        type="radio"
        aria-label={`${label}: ${choice.label}`}
        name={name}
        value={choice.value}
        required={required}
        checked={checked}
        onChange={handleChange}
        className="sr-only"
      />
      <span>{choice.label}</span>
      {choice.priceDeltaCents > 0 && (
        <span
          className={cn(
            "ml-1.5 text-xs",
            checked ? "text-background/70" : "text-muted-foreground"
          )}
        >
          +{price}
        </span>
      )}
    </label>
  )
}

function ChoiceOptionLayout({
  children,
  label,
  showSizeGuide,
}: {
  children: ReactNode
  label: string
  showSizeGuide: boolean
}) {
  if (showSizeGuide) {
    return (
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-medium">{label}</div>
          <SizeGuideDialog />
        </div>
        {children}
      </div>
    )
  }

  return (
    <ProductOptionControlRow label={label}>{children}</ProductOptionControlRow>
  )
}

function ProductOptionControlRow({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-[96px_1fr] sm:items-start">
      <div className="pt-2 text-sm font-medium">{label}</div>
      {children}
    </div>
  )
}

function ProductOptionButtonGroup({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>
}
