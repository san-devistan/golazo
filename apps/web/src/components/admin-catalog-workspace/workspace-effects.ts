import { getErrorMessage, priceInputToCents } from "@/lib/shop"
import { toast } from "@workspace/ui/lib/toast"
import { type SetStateAction, useCallback, useEffect } from "react"

import { AUTOSAVE_DELAY_MS } from "./constants"
import {
  categoryFormAutosaveKey,
  nullableText,
  parseSortOrder,
  productFormAutosaveKey,
  productRecordToForm,
  productUpsertPayload,
} from "./model"
import type {
  AdminOptionTemplate,
  AdminProductRecord,
  CategoryFormState,
  CategoryId,
  ProductFormState,
  ProductId,
} from "./types"
import type { AdminCatalogQueryData } from "./workspace-data"
import type { LastSavedKeyRef } from "./workspace-state"

type SetCategoryForm = (value: SetStateAction<CategoryFormState | null>) => void
type SetProductForm = (value: SetStateAction<ProductFormState | null>) => void

type UpsertCategory = (args: {
  categoryId: CategoryId | null
  kind: "collection" | "group"
  name: string
  logoUrl: string | null
  parentId: CategoryId | null
  sortOrder: number
  isActive: boolean
}) => Promise<CategoryId>

type UpsertProduct = (
  payload: ReturnType<typeof productUpsertPayload>
) => Promise<ProductId>

export function useBackendSetupState({
  data,
  setShowBackendSetupState,
}: {
  data: AdminCatalogQueryData
  setShowBackendSetupState: (value: SetStateAction<boolean>) => void
}) {
  useEffect(() => {
    if (data !== undefined) {
      setShowBackendSetupState(false)
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setShowBackendSetupState(true)
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [data, setShowBackendSetupState])
}

export function useEditProductSearchParam({
  data,
  productRecords,
  setProductForm,
}: {
  data: AdminCatalogQueryData
  productRecords: Array<AdminProductRecord>
  setProductForm: SetProductForm
}) {
  useEffect(() => {
    if (data === undefined) {
      return
    }

    const url = new URL(window.location.href)
    const editProductId = url.searchParams.get("editProduct")

    if (!editProductId) {
      return
    }

    const record = productRecords.find(
      (item) => item.product._id === editProductId
    )
    if (record) {
      setProductForm(productRecordToForm(record))
    }

    url.searchParams.delete("editProduct")
    window.history.replaceState(
      window.history.state,
      "",
      `${url.pathname}${url.search}${url.hash}`
    )
  }, [data, productRecords, setProductForm])
}

export function useCategoryAutosave({
  categoryForm,
  childCategoryCount,
  lastSavedCategoryKeyRef,
  setCategoryForm,
  upsertCategory,
}: {
  categoryForm: CategoryFormState | null
  childCategoryCount: number
  lastSavedCategoryKeyRef: LastSavedKeyRef
  setCategoryForm: SetCategoryForm
  upsertCategory: UpsertCategory
}) {
  const saveCategoryForm = useCallback(
    async (form: CategoryFormState, key: string) => {
      try {
        const savedCategoryId = await upsertCategory({
          categoryId: form.categoryId,
          kind: form.kind,
          name: form.name,
          logoUrl: nullableText(form.logoUrl),
          parentId: form.parentId,
          sortOrder: parseSortOrder(form.sortOrder, childCategoryCount),
          isActive: form.isActive,
        })

        lastSavedCategoryKeyRef.current = key
        setCategoryForm((current) => {
          if (!current || categoryFormAutosaveKey(current) !== key) {
            return current
          }

          const nextForm = { ...current, categoryId: savedCategoryId }
          lastSavedCategoryKeyRef.current = categoryFormAutosaveKey(nextForm)

          return nextForm
        })
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [
      childCategoryCount,
      lastSavedCategoryKeyRef,
      setCategoryForm,
      upsertCategory,
    ]
  )

  useEffect(() => {
    if (!categoryForm) {
      lastSavedCategoryKeyRef.current = null
      return undefined
    }

    if (!categoryForm.name.trim()) {
      return undefined
    }

    const key = categoryFormAutosaveKey(categoryForm)
    if (lastSavedCategoryKeyRef.current === key) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      void saveCategoryForm(categoryForm, key)
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [categoryForm, lastSavedCategoryKeyRef, saveCategoryForm])
}

export function useProductAutosave({
  lastSavedProductKeyRef,
  productForm,
  productRecords,
  setProductForm,
  templates,
  upsertProduct,
}: {
  lastSavedProductKeyRef: LastSavedKeyRef
  productForm: ProductFormState | null
  productRecords: Array<AdminProductRecord>
  setProductForm: SetProductForm
  templates: Array<AdminOptionTemplate>
  upsertProduct: UpsertProduct
}) {
  const saveProductForm = useCallback(
    async (form: ProductFormState, key: string) => {
      try {
        const savedProductId = await upsertProduct(
          productUpsertPayload({ form, productRecords, templates })
        )

        lastSavedProductKeyRef.current = key
        setProductForm((current) => {
          if (!current || productFormAutosaveKey(current) !== key) {
            return current
          }

          const nextForm = { ...current, productId: savedProductId }
          lastSavedProductKeyRef.current = productFormAutosaveKey(nextForm)

          return nextForm
        })
      } catch (error) {
        toast.error(getErrorMessage(error))
      }
    },
    [
      lastSavedProductKeyRef,
      productRecords,
      setProductForm,
      templates,
      upsertProduct,
    ]
  )

  useEffect(() => {
    if (!productForm) {
      lastSavedProductKeyRef.current = null
      return undefined
    }

    if (!productForm.categoryId || !productForm.name.trim()) {
      return undefined
    }

    try {
      priceInputToCents(productForm.basePrice)
    } catch {
      return undefined
    }

    const key = productFormAutosaveKey(productForm)
    if (lastSavedProductKeyRef.current === key) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      void saveProductForm(productForm, key)
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [lastSavedProductKeyRef, productForm, saveProductForm])
}
