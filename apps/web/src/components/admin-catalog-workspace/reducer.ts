import type { SetStateAction } from "react"

import type { AdminCatalogAction, AdminCatalogState } from "./types"

export function isStateUpdater<T>(
  value: SetStateAction<T>
): value is (current: T) => T {
  return typeof value === "function"
}

export function resolveStateAction<T>(value: SetStateAction<T>, current: T): T {
  return isStateUpdater(value) ? value(current) : value
}

export function adminCatalogReducer(
  state: AdminCatalogState,
  action: AdminCatalogAction
): AdminCatalogState {
  if (action.type === "setCategoryForm") {
    return {
      ...state,
      categoryForm: resolveStateAction(action.value, state.categoryForm),
    }
  }

  if (action.type === "setProductForm") {
    return {
      ...state,
      productForm: resolveStateAction(action.value, state.productForm),
    }
  }

  if (action.type === "setDeleteTarget") {
    return {
      ...state,
      deleteTarget: resolveStateAction(action.value, state.deleteTarget),
    }
  }

  if (action.type === "setIsDeleting") {
    return {
      ...state,
      isDeleting: resolveStateAction(action.value, state.isDeleting),
    }
  }

  if (action.type === "setIsUploading") {
    return {
      ...state,
      isUploading: resolveStateAction(action.value, state.isUploading),
    }
  }

  return {
    ...state,
    showBackendSetupState: resolveStateAction(
      action.value,
      state.showBackendSetupState
    ),
  }
}
