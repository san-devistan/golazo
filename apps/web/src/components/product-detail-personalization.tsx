import type {
  PersonalizationConfig,
  PersonalizationProductOption,
} from "@/components/product-detail-types"
import { useMoneyFormatter } from "@/lib/preferences"
import { displayOptionLabel } from "@/lib/shop"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import { useCallback, type ChangeEvent } from "react"

export function PersonalizationOptionControl({
  option,
  enabled,
  fieldValues,
  onToggle,
  onFieldChange,
  currency,
}: {
  option: PersonalizationProductOption
  enabled: boolean
  fieldValues: Record<string, string>
  onToggle: (enabled: boolean) => void
  onFieldChange: (fieldKey: string, value: string) => void
  currency: string
}) {
  const label = displayOptionLabel(option.label)
  const formatPrice = useMoneyFormatter()

  return (
    <div className="grid gap-3">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-wrap items-start gap-3">
        {!option.isRequired && (
          <PersonalizationToggleButton
            checked={enabled}
            label={label}
            price={formatPrice(option.priceDeltaCents, currency)}
            onToggle={onToggle}
          />
        )}
        {option.isRequired && option.priceDeltaCents > 0 && (
          <div className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center bg-[#eef1f3] px-3 text-sm font-semibold">
            +{formatPrice(option.priceDeltaCents, currency)}
          </div>
        )}
        {enabled && (
          <div className="grid min-w-[min(18rem,100%)] flex-1 gap-2 sm:grid-cols-2">
            {option.config.fields.map((field) => (
              <PersonalizationFieldInput
                key={field.key}
                optionId={option._id}
                field={field}
                value={fieldValues[field.key] ?? ""}
                onFieldChange={onFieldChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PersonalizationToggleButton({
  checked,
  label,
  price,
  onToggle,
}: {
  checked: boolean
  label: string
  price: string
  onToggle: (enabled: boolean) => void
}) {
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onToggle(event.target.checked)
    },
    [onToggle]
  )

  return (
    <label
      className={cn(
        "inline-flex min-h-11 min-w-11 shrink-0 cursor-pointer items-center justify-center px-3 text-sm font-semibold transition has-focus-visible:ring-2 has-focus-visible:ring-[#111]/30",
        checked
          ? "bg-foreground text-background"
          : "bg-[#eef1f3] text-foreground hover:bg-black/10"
      )}
    >
      <input
        type="checkbox"
        aria-label={`Add ${label}`}
        checked={checked}
        onChange={handleChange}
        className="sr-only"
      />
      <span>+{price}</span>
    </label>
  )
}

function PersonalizationFieldInput({
  optionId,
  field,
  value,
  onFieldChange,
}: {
  optionId: string
  field: PersonalizationConfig["fields"][number]
  value: string
  onFieldChange: (fieldKey: string, value: string) => void
}) {
  const fieldId = `${optionId}-${field.key}`
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onFieldChange(field.key, event.target.value)
    },
    [field.key, onFieldChange]
  )

  return (
    <div>
      <Label htmlFor={fieldId} className="sr-only">
        {field.label}
      </Label>
      <Input
        id={fieldId}
        type={field.inputType}
        required={field.required}
        placeholder={field.label}
        value={value}
        className="h-9 rounded-none border-foreground/25 bg-background text-sm font-semibold"
        onChange={handleChange}
      />
    </div>
  )
}
