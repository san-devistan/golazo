import type { CartConfigurationSummaryItem } from "@/lib/customer-state"
import type { ProductRouteMode } from "@/lib/shop-queries"
import type { GenericId } from "convex/values"

export type ProductId = GenericId<"products">

export type ChoiceConfig = {
  type: "choice"
  choices: Array<{
    label: string
    value: string
    priceDeltaCents: number
  }>
}

export type PersonalizationConfig = {
  type: "personalization"
  fields: Array<{
    key: string
    label: string
    inputType: "text" | "number"
    required: boolean
  }>
}

export type ProductOption = {
  _id: string
  label: string
  isRequired: boolean
  priceDeltaCents: number
  config: ChoiceConfig | PersonalizationConfig
}

export type ProductMetadata = {
  _id: string
  label: string
  type?: "text" | "number" | "boolean" | "link"
  value: string
  linkUrl?: string | null
  showOnProductPage?: boolean
}

export type ProductDetailImage = {
  _id: string
  imageUrl: string
}

export type ProductDetail = {
  product: {
    _id: ProductId
    name: string
    slug: string
    description: string
    basePriceCents: number
    currency: string
    imageUrl: string | null
  }
  images: Array<ProductDetailImage>
  category: {
    _id: string
    name: string
    path: string
  }
  categories: Array<{
    _id: string
    name: string
    parentId: string | null
    path: string
    sortOrder: number
  }>
  options: Array<ProductOption>
  metadata: Array<ProductMetadata>
}

export type ProductConfigurationState = {
  productId: ProductId
  choiceValues: Record<string, string>
  enabledOptions: Record<string, boolean>
  fieldValues: Record<string, Record<string, string>>
}

export type ProductConfiguratorState = {
  actionErrorMessage: string | null
  configuration: ProductConfigurationState
  isDeleteDialogOpen: boolean
  isDeleting: boolean
  isEditDialogOpen: boolean
  quantity: number
}

export type ProductConfiguratorAction =
  | {
      type: "setConfiguration"
      value: React.SetStateAction<ProductConfigurationState>
    }
  | {
      type: "setQuantity"
      value: React.SetStateAction<number>
    }
  | {
      type: "setIsEditDialogOpen"
      value: React.SetStateAction<boolean>
    }
  | {
      type: "setIsDeleteDialogOpen"
      value: React.SetStateAction<boolean>
    }
  | {
      type: "setIsDeleting"
      value: React.SetStateAction<boolean>
    }
  | {
      type: "setActionErrorMessage"
      value: React.SetStateAction<string | null>
    }

export type ChoiceProductOption = ProductOption & { config: ChoiceConfig }
export type PersonalizationProductOption = ProductOption & {
  config: PersonalizationConfig
}

export type ProductDetailPageProps = {
  mode: ProductRouteMode
  slug: string
}

export type { CartConfigurationSummaryItem }
