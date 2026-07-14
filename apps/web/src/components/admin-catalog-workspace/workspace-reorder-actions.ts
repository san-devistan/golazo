import { getErrorMessage } from "@/lib/shop"
import { toast } from "@workspace/ui/lib/toast"
import { useCallback } from "react"

import type { CategoryId, ProductId } from "./types"

export function useWorkspaceReorderActions({
  parentId,
  reorderCategories,
  reorderProducts,
}: {
  parentId: CategoryId | null
  reorderCategories: (args: {
    parentId: CategoryId | null
    orderedCategoryIds: Array<CategoryId>
  }) => Promise<unknown>
  reorderProducts: (args: {
    categoryId: CategoryId
    orderedProductIds: Array<ProductId>
  }) => Promise<unknown>
}) {
  const handleReorderCategoriesClick = useCallback(
    (orderedCategoryIds: Array<CategoryId>) => {
      void reorderCategories({ parentId, orderedCategoryIds })
        .then(() => toast.success("Catalog order saved."))
        .catch((error: unknown) => toast.error(getErrorMessage(error)))
    },
    [parentId, reorderCategories]
  )
  const handleReorderProductsClick = useCallback(
    (categoryId: CategoryId, orderedProductIds: Array<ProductId>) => {
      void reorderProducts({ categoryId, orderedProductIds })
        .then(() => toast.success("Product order saved."))
        .catch((error: unknown) => toast.error(getErrorMessage(error)))
    },
    [reorderProducts]
  )

  return { handleReorderCategoriesClick, handleReorderProductsClick }
}
