import { getErrorMessage } from "@/lib/shop"
import { toast } from "@workspace/ui/lib/toast"
import { useCallback } from "react"

import type { AdminCategory, CategoryId } from "./types"

export function useCategoryVisibilityActions({
  setCategoryVisibility,
}: {
  setCategoryVisibility: (args: {
    categoryId: CategoryId
    isActive: boolean
  }) => Promise<unknown>
}) {
  const handleToggleCategory = useCallback(
    (category: AdminCategory) => {
      const isActive = !(category.isActive ?? true)

      void setCategoryVisibility({ categoryId: category._id, isActive })
        .then(() =>
          toast.success(
            isActive ? "Catalog item visible." : "Catalog item hidden."
          )
        )
        .catch((error: unknown) => toast.error(getErrorMessage(error)))
    },
    [setCategoryVisibility]
  )

  return { handleToggleCategory }
}
