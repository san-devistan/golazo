import type {
  CartConfigurationSummaryItem,
  ChoiceProductOption,
  PersonalizationProductOption,
  ProductConfigurationState,
  ProductConfiguratorAction,
  ProductConfiguratorState,
  ProductDetail,
  ProductMetadata,
  ProductOption,
} from "@/components/product-detail-types"
import { displayOptionLabel } from "@/lib/shop"
import type { ProductRouteMode } from "@/lib/shop-queries"
import type { SetStateAction } from "react"

export const EMPTY_FIELD_VALUES: Record<string, string> = {}

export function isChoiceOption(
  option: ProductOption
): option is ChoiceProductOption {
  return option.config.type === "choice"
}

export function isPersonalizationOption(
  option: ProductOption
): option is PersonalizationProductOption {
  return option.config.type === "personalization"
}

export function createInitialConfiguration(
  detail: ProductDetail
): ProductConfigurationState {
  const choiceValues: Record<string, string> = {}
  const enabledOptions: Record<string, boolean> = {}

  for (const option of detail.options) {
    if (option.config.type === "choice") {
      choiceValues[option._id] = option.isRequired
        ? (option.config.choices[0]?.value ?? "")
        : ""
    }

    if (option.config.type === "personalization") {
      enabledOptions[option._id] = option.isRequired
    }
  }

  return {
    productId: detail.product._id,
    choiceValues,
    enabledOptions,
    fieldValues: {},
  }
}

export function createInitialProductConfiguratorState(
  detail: ProductDetail
): ProductConfiguratorState {
  return {
    actionErrorMessage: null,
    configuration: createInitialConfiguration(detail),
    isDeleteDialogOpen: false,
    isDeleting: false,
    isEditDialogOpen: false,
    quantity: 1,
  }
}

function isStateUpdater<T>(
  value: SetStateAction<T>
): value is (current: T) => T {
  return typeof value === "function"
}

function resolveStateAction<T>(value: SetStateAction<T>, current: T): T {
  return isStateUpdater(value) ? value(current) : value
}

export function productConfiguratorReducer(
  state: ProductConfiguratorState,
  action: ProductConfiguratorAction
): ProductConfiguratorState {
  if (action.type === "setConfiguration") {
    return {
      ...state,
      configuration: resolveStateAction(action.value, state.configuration),
    }
  }

  if (action.type === "setQuantity") {
    return {
      ...state,
      quantity: resolveStateAction(action.value, state.quantity),
    }
  }

  if (action.type === "setIsEditDialogOpen") {
    return {
      ...state,
      isEditDialogOpen: resolveStateAction(
        action.value,
        state.isEditDialogOpen
      ),
    }
  }

  if (action.type === "setIsDeleteDialogOpen") {
    return {
      ...state,
      isDeleteDialogOpen: resolveStateAction(
        action.value,
        state.isDeleteDialogOpen
      ),
    }
  }

  if (action.type === "setIsDeleting") {
    return {
      ...state,
      isDeleting: resolveStateAction(action.value, state.isDeleting),
    }
  }

  return {
    ...state,
    actionErrorMessage: resolveStateAction(
      action.value,
      state.actionErrorMessage
    ),
  }
}

export function productMetadataForMode(
  metadata: Array<ProductMetadata>,
  mode: ProductRouteMode
) {
  return mode === "admin"
    ? metadata
    : metadata.filter((item) => item.showOnProductPage ?? true)
}

export function productMetadataLinkHref(linkUrl: string | null | undefined) {
  const value = linkUrl?.trim()
  if (!value) {
    return null
  }

  try {
    const url = new URL(value)

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null
    }

    return url.href
  } catch {
    return null
  }
}

export function productMetadataLinkLabel(href: string) {
  try {
    const url = new URL(href)
    const host = url.hostname.replace(/^www\./, "")
    const path = url.pathname === "/" ? "" : url.pathname

    return `${host}${path}`
  } catch {
    return "Open link"
  }
}

export function productGalleryImages(detail: ProductDetail) {
  if (detail.images.length > 0) {
    return detail.images
  }

  if (!detail.product.imageUrl) {
    return []
  }

  return [
    {
      _id: `${detail.product._id}-legacy-image`,
      imageUrl: detail.product.imageUrl,
    },
  ]
}

export function buildCartConfigurationSummary(
  detail: ProductDetail,
  configuration: ProductConfigurationState
): Array<CartConfigurationSummaryItem> {
  const summary: Array<CartConfigurationSummaryItem> = []

  for (const option of detail.options) {
    if (option.config.type === "choice") {
      const selectedChoiceLabel = option.config.choices.find(
        (choice) => choice.value === configuration.choiceValues[option._id]
      )?.label

      if (option.isRequired && !selectedChoiceLabel) {
        throw new Error(`Choose ${displayOptionLabel(option.label)}.`)
      }

      if (selectedChoiceLabel) {
        summary.push({
          label: displayOptionLabel(option.label),
          value: selectedChoiceLabel,
        })
      }
      continue
    }

    const enabled =
      option.isRequired || configuration.enabledOptions[option._id]

    if (!enabled) {
      continue
    }

    const fieldValues = configuration.fieldValues[option._id] ?? {}
    const values = option.config.fields.flatMap((field) => {
      const value = fieldValues[field.key]?.trim() ?? ""

      if (field.required && !value) {
        throw new Error(`Enter ${field.label}.`)
      }

      return value ? [value] : []
    })

    summary.push({
      label: displayOptionLabel(option.label),
      value: values.length > 0 ? values.join(", ") : "Included",
    })
  }

  return summary
}
