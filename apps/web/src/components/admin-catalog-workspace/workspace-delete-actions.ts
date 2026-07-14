import { getErrorMessage } from "@/lib/shop"
import { toast } from "@workspace/ui/lib/toast"
import { useCallback } from "react"

import { categoryKindForAdmin, categoryLabel, parentAdminHref } from "./model"
import type {
  AdminCategory,
  AdminProductRecord,
  CategoryId,
  DeleteTarget,
  ProductId,
} from "./types"
import type { SetBoolean, SetDeleteTarget } from "./workspace-action-types"

export function useWorkspaceDeleteActions({
  categories,
  currentCategory,
  deleteCategory,
  deleteProduct,
  deleteTarget,
  productRecordsById,
  setDeleteTarget,
  setIsDeleting,
}: {
  categories: Array<AdminCategory>
  currentCategory: AdminCategory | null
  deleteCategory: (args: { categoryId: CategoryId }) => Promise<unknown>
  deleteProduct: (args: { productId: ProductId }) => Promise<unknown>
  deleteTarget: DeleteTarget | null
  productRecordsById: Map<ProductId, AdminProductRecord>
  setDeleteTarget: SetDeleteTarget
  setIsDeleting: SetBoolean
}) {
  const handleDeleteCategoryById = useCallback(
    (targetCategoryId: CategoryId) => {
      const category = categories.find((item) => item._id === targetCategoryId)

      if (category) {
        setDeleteTarget({
          type: "category",
          category: {
            ...category,
            kind: categoryKindForAdmin(category, categories),
          },
        })
      }
    },
    [categories, setDeleteTarget]
  )
  const handleDeleteProductById = useCallback(
    (targetProductId: ProductId) => {
      const record = productRecordsById.get(targetProductId)

      if (record) {
        setDeleteTarget({ type: "product", product: record.product })
      }
    },
    [productRecordsById, setDeleteTarget]
  )
  const handleCancelDelete = useCallback(() => {
    setDeleteTarget(null)
  }, [setDeleteTarget])
  const handleConfirmDeleteClick = useCallback(() => {
    void confirmDelete({
      currentCategory,
      deleteCategory,
      deleteProduct,
      deleteTarget,
      setDeleteTarget,
      setIsDeleting,
    })
  }, [
    currentCategory,
    deleteCategory,
    deleteProduct,
    deleteTarget,
    setDeleteTarget,
    setIsDeleting,
  ])

  return {
    handleCancelDelete,
    handleConfirmDeleteClick,
    handleDeleteCategoryById,
    handleDeleteProductById,
  }
}

async function confirmDelete({
  currentCategory,
  deleteCategory,
  deleteProduct,
  deleteTarget,
  setDeleteTarget,
  setIsDeleting,
}: {
  currentCategory: AdminCategory | null
  deleteCategory: (args: { categoryId: CategoryId }) => Promise<unknown>
  deleteProduct: (args: { productId: ProductId }) => Promise<unknown>
  deleteTarget: DeleteTarget | null
  setDeleteTarget: SetDeleteTarget
  setIsDeleting: SetBoolean
}) {
  if (!deleteTarget) {
    return
  }

  setIsDeleting(true)

  try {
    if (deleteTarget.type === "category") {
      const parentHref = parentAdminHref(deleteTarget.category)

      await deleteCategory({ categoryId: deleteTarget.category._id })
      toast.success(
        `${categoryLabel(deleteTarget.category.kind ?? "collection")} deleted.`
      )
      setDeleteTarget(null)

      if (currentCategory?._id === deleteTarget.category._id) {
        window.location.assign(parentHref)
      }

      return
    }

    await deleteProduct({ productId: deleteTarget.product._id })
    toast.success("Product deleted.")
    setDeleteTarget(null)
  } catch (error) {
    toast.error(getErrorMessage(error))
  } finally {
    setIsDeleting(false)
  }
}
