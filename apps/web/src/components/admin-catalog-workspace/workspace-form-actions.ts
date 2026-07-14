import { useCallback } from "react"

import {
  categoryKindForAdmin,
  emptyCategoryForm,
  emptyProductForm,
  productRecordToForm,
} from "./model"
import type {
  AdminCategory,
  AdminOptionTemplate,
  AdminProductRecord,
  ProductId,
} from "./types"
import type { SetCategoryForm, SetProductForm } from "./workspace-action-types"

export function useWorkspaceFormActions({
  categories,
  childCategories,
  currentCategory,
  currentCategoryKind,
  directProductRecords,
  productRecords,
  productRecordsById,
  setCategoryForm,
  setProductForm,
  templates,
}: {
  categories: Array<AdminCategory>
  childCategories: Array<AdminCategory>
  currentCategory: AdminCategory | null
  currentCategoryKind: "collection" | "group" | null
  directProductRecords: Array<AdminProductRecord>
  productRecords: Array<AdminProductRecord>
  productRecordsById: Map<ProductId, AdminProductRecord>
  setCategoryForm: SetCategoryForm
  setProductForm: SetProductForm
  templates: Array<AdminOptionTemplate>
}) {
  const handleAddCollection = useCallback(() => {
    const collectionParentId =
      currentCategoryKind === "group" ? (currentCategory?._id ?? null) : null

    setCategoryForm(
      emptyCategoryForm(
        "collection",
        collectionParentId,
        childCategories.length
      )
    )
  }, [
    childCategories.length,
    currentCategory?._id,
    currentCategoryKind,
    setCategoryForm,
  ])
  const handleAddGroup = useCallback(() => {
    setCategoryForm(emptyCategoryForm("group", null, childCategories.length))
  }, [childCategories.length, setCategoryForm])
  const handleAddProduct = useCallback(() => {
    if (currentCategory && currentCategoryKind === "collection") {
      setProductForm(
        emptyProductForm(
          currentCategory._id,
          templates,
          directProductRecords.length
        )
      )
    }
  }, [
    currentCategory,
    currentCategoryKind,
    directProductRecords.length,
    setProductForm,
    templates,
  ])
  const handleAddToCategory = useCallback(
    (category: AdminCategory) => {
      const kind = categoryKindForAdmin(category, categories)

      if (kind === "group") {
        setCategoryForm({
          categoryId: category._id,
          kind,
          name: category.name,
          logoUrl: category.logoUrl ?? "",
          parentId: category.parentId,
          sortOrder: String(category.sortOrder),
          isActive: category.isActive ?? true,
        })
        return
      }

      const productCount = productRecords.filter(
        (record) => record.product.categoryId === category._id
      ).length

      setProductForm(emptyProductForm(category._id, templates, productCount))
    },
    [categories, productRecords, setCategoryForm, setProductForm, templates]
  )
  const handleEditCategory = useCallback(
    (category: AdminCategory) => {
      setCategoryForm({
        categoryId: category._id,
        kind: categoryKindForAdmin(category, categories),
        name: category.name,
        logoUrl: category.logoUrl ?? "",
        parentId: category.parentId,
        sortOrder: String(category.sortOrder),
        isActive: category.isActive ?? true,
      })
    },
    [categories, setCategoryForm]
  )
  const handleEditProduct = useCallback(
    (product: AdminProductRecord["product"]) => {
      const record = productRecordsById.get(product._id)
      if (record) {
        setProductForm(productRecordToForm(record))
      }
    },
    [productRecordsById, setProductForm]
  )

  return {
    handleAddCollection,
    handleAddGroup,
    handleAddProduct,
    handleAddToCategory,
    handleEditCategory,
    handleEditProduct,
  }
}
