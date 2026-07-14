import {
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useReducer,
  useRef,
} from "react"

import { INITIAL_ADMIN_CATALOG_STATE } from "./constants"
import { adminCatalogReducer } from "./reducer"
import type { CategoryFormState, DeleteTarget, ProductFormState } from "./types"

export type LastSavedKeyRef = MutableRefObject<string | null>

export function useAdminCatalogWorkspaceState() {
  const [catalogState, dispatchCatalog] = useReducer(
    adminCatalogReducer,
    INITIAL_ADMIN_CATALOG_STATE
  )
  const lastSavedCategoryKeyRef = useRef<string | null>(null)
  const lastSavedProductKeyRef = useRef<string | null>(null)
  const setCategoryForm = useCallback(
    (value: SetStateAction<CategoryFormState | null>) => {
      dispatchCatalog({ type: "setCategoryForm", value })
    },
    []
  )
  const setProductForm = useCallback(
    (value: SetStateAction<ProductFormState | null>) => {
      dispatchCatalog({ type: "setProductForm", value })
    },
    []
  )
  const setDeleteTarget = useCallback(
    (value: SetStateAction<DeleteTarget | null>) => {
      dispatchCatalog({ type: "setDeleteTarget", value })
    },
    []
  )
  const setIsDeleting = useCallback((value: SetStateAction<boolean>) => {
    dispatchCatalog({ type: "setIsDeleting", value })
  }, [])
  const setIsUploading = useCallback((value: SetStateAction<boolean>) => {
    dispatchCatalog({ type: "setIsUploading", value })
  }, [])
  const setShowBackendSetupState = useCallback(
    (value: SetStateAction<boolean>) => {
      dispatchCatalog({ type: "setShowBackendSetupState", value })
    },
    []
  )

  return {
    ...catalogState,
    lastSavedCategoryKeyRef,
    lastSavedProductKeyRef,
    setCategoryForm,
    setDeleteTarget,
    setIsDeleting,
    setIsUploading,
    setProductForm,
    setShowBackendSetupState,
  }
}
