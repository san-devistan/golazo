import { ChoiceOptionControl } from "@/components/product-detail-choice-options"
import {
  isChoiceOption,
  isPersonalizationOption,
  EMPTY_FIELD_VALUES,
} from "@/components/product-detail-model"
import { PersonalizationOptionControl } from "@/components/product-detail-personalization"
import type {
  ProductConfigurationState,
  ProductOption,
} from "@/components/product-detail-types"
import { displayOptionLabel } from "@/lib/shop"
import { useCallback } from "react"

export function ProductOptionControls({
  options,
  choiceValues,
  enabledOptions,
  fieldValues,
  currency,
  onConfigurationChange,
}: {
  options: Array<ProductOption>
  choiceValues: Record<string, string>
  enabledOptions: Record<string, boolean>
  fieldValues: Record<string, Record<string, string>>
  currency: string
  onConfigurationChange: (
    value: React.SetStateAction<ProductConfigurationState>
  ) => void
}) {
  return options.map((option) => (
    <ProductOptionControl
      key={option._id}
      option={option}
      choiceValues={choiceValues}
      enabledOptions={enabledOptions}
      fieldValues={fieldValues}
      currency={currency}
      onConfigurationChange={onConfigurationChange}
    />
  ))
}

function ProductOptionControl({
  option,
  choiceValues,
  enabledOptions,
  fieldValues,
  currency,
  onConfigurationChange,
}: {
  option: ProductOption
  choiceValues: Record<string, string>
  enabledOptions: Record<string, boolean>
  fieldValues: Record<string, Record<string, string>>
  currency: string
  onConfigurationChange: (
    value: React.SetStateAction<ProductConfigurationState>
  ) => void
}) {
  const handleChoiceChange = useCallback(
    (value: string) => {
      onConfigurationChange((current) => ({
        ...current,
        choiceValues: {
          ...current.choiceValues,
          [option._id]: value,
        },
      }))
    },
    [onConfigurationChange, option._id]
  )
  const handleToggle = useCallback(
    (enabled: boolean) => {
      onConfigurationChange((current) => ({
        ...current,
        enabledOptions: {
          ...current.enabledOptions,
          [option._id]: enabled,
        },
      }))
    },
    [onConfigurationChange, option._id]
  )
  const handleFieldChange = useCallback(
    (fieldKey: string, value: string) => {
      onConfigurationChange((current) => ({
        ...current,
        fieldValues: {
          ...current.fieldValues,
          [option._id]: {
            ...current.fieldValues[option._id],
            [fieldKey]: value,
          },
        },
      }))
    },
    [onConfigurationChange, option._id]
  )

  if (isChoiceOption(option)) {
    const label = displayOptionLabel(option.label)

    return (
      <ChoiceOptionControl
        option={option}
        label={label}
        showSizeGuide={isSizeOptionLabel(label)}
        value={choiceValues[option._id] ?? ""}
        onChange={handleChoiceChange}
        currency={currency}
      />
    )
  }

  if (isPersonalizationOption(option)) {
    return (
      <PersonalizationOptionControl
        option={option}
        enabled={option.isRequired || enabledOptions[option._id]}
        fieldValues={fieldValues[option._id] ?? EMPTY_FIELD_VALUES}
        onToggle={handleToggle}
        onFieldChange={handleFieldChange}
        currency={currency}
      />
    )
  }

  return null
}

function isSizeOptionLabel(label: string) {
  const normalizedLabel = label.trim().toLowerCase()

  return (
    normalizedLabel === "size" ||
    normalizedLabel === "taille" ||
    normalizedLabel.includes("size") ||
    normalizedLabel.includes("taille")
  )
}
