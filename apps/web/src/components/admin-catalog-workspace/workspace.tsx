import { api } from "@workspace/backend/api"
import { useAction, useMutation, useQuery } from "convex/react"
import { useMemo } from "react"

import type { CategoryId } from "./types"
import { useAdminCatalogWorkspaceActions } from "./workspace-actions"
import { useAdminCatalogWorkspaceData } from "./workspace-data"
import {
  useBackendSetupState,
  useCategoryAutosave,
  useEditProductSearchParam,
  useProductAutosave,
} from "./workspace-effects"
import { useAdminCatalogWorkspaceState } from "./workspace-state"
import { AdminCatalogWorkspaceView } from "./workspace-view"

export function AdminCatalogWorkspace({
  categoryId,
  categoryPath,
}: {
  categoryId?: CategoryId
  categoryPath?: string
}) {
  const data = useQuery(api.shop.listAdmin)
  const upsertCategory = useMutation(api.shop.upsertCategory)
  const upsertProduct = useAction(api.cloudinary.upsertProduct)
  const deleteCategory = useAction(api.cloudinary.deleteCategory)
  const deleteProduct = useAction(api.cloudinary.deleteProduct)
  const reorderCategories = useMutation(api.shop.reorderCategories)
  const reorderProducts = useMutation(api.shop.reorderProducts)
  const setCategoryVisibility = useMutation(api.shop.setCategoryVisibility)
  const createCloudinaryUploadSignature = useAction(
    api.cloudinary.createUploadSignature
  )
  const createCollectionLogoUploadSignature = useAction(
    api.cloudinary.createCollectionLogoUploadSignature
  )
  const workspaceState = useAdminCatalogWorkspaceState()
  const workspaceData = useAdminCatalogWorkspaceData({
    categoryId,
    categoryPath,
    data,
  })

  useBackendSetupState({
    data,
    setShowBackendSetupState: workspaceState.setShowBackendSetupState,
  })
  useEditProductSearchParam({
    data,
    productRecords: workspaceData.productRecords,
    setProductForm: workspaceState.setProductForm,
  })
  useCategoryAutosave({
    categoryForm: workspaceState.categoryForm,
    childCategoryCount: workspaceData.childCategories.length,
    lastSavedCategoryKeyRef: workspaceState.lastSavedCategoryKeyRef,
    setCategoryForm: workspaceState.setCategoryForm,
    upsertCategory,
  })
  useProductAutosave({
    lastSavedProductKeyRef: workspaceState.lastSavedProductKeyRef,
    productForm: workspaceState.productForm,
    productRecords: workspaceData.productRecords,
    setProductForm: workspaceState.setProductForm,
    templates: workspaceData.templates,
    upsertProduct,
  })

  const actions = useAdminCatalogWorkspaceActions({
    categories: workspaceData.categories,
    categoryForm: workspaceState.categoryForm,
    childCategories: workspaceData.childCategories,
    createCloudinaryUploadSignature,
    createCollectionLogoUploadSignature,
    currentCategory: workspaceData.currentCategory,
    currentCategoryKind: workspaceData.currentCategoryKind,
    deleteCategory,
    deleteProduct,
    deleteTarget: workspaceState.deleteTarget,
    directProductRecords: workspaceData.directProductRecords,
    isUploading: workspaceState.isUploading,
    parentId: workspaceData.parentId,
    productForm: workspaceState.productForm,
    productRecords: workspaceData.productRecords,
    productRecordsById: workspaceData.productRecordsById,
    reorderCategories,
    reorderProducts,
    setCategoryForm: workspaceState.setCategoryForm,
    setCategoryVisibility,
    setDeleteTarget: workspaceState.setDeleteTarget,
    setIsDeleting: workspaceState.setIsDeleting,
    setIsUploading: workspaceState.setIsUploading,
    setProductForm: workspaceState.setProductForm,
    templates: workspaceData.templates,
  })
  const dockAvailability = useMemo(
    () => ({
      canAddCollection: workspaceData.canAddCollection,
      canAddGroup: workspaceData.canAddGroup,
      canAddProduct: workspaceData.canAddProduct,
    }),
    [
      workspaceData.canAddCollection,
      workspaceData.canAddGroup,
      workspaceData.canAddProduct,
    ]
  )
  const status = useMemo(
    () => ({
      isDeleting: workspaceState.isDeleting,
      isUploading: workspaceState.isUploading,
      showBackendSetupState: workspaceState.showBackendSetupState,
    }),
    [
      workspaceState.isDeleting,
      workspaceState.isUploading,
      workspaceState.showBackendSetupState,
    ]
  )

  return (
    <AdminCatalogWorkspaceView
      actions={actions}
      categories={workspaceData.categories}
      categoryForm={workspaceState.categoryForm}
      categoryPath={categoryPath}
      childCategories={workspaceData.childCategories}
      currentCategory={workspaceData.currentCategory}
      currentCategoryKind={workspaceData.currentCategoryKind}
      data={data}
      deleteTarget={workspaceState.deleteTarget}
      dockAvailability={dockAvailability}
      groupCategories={workspaceData.groupCategories}
      pageProducts={workspaceData.pageProducts}
      productAssignableCategories={workspaceData.productAssignableCategories}
      productForm={workspaceState.productForm}
      setCategoryForm={workspaceState.setCategoryForm}
      setProductForm={workspaceState.setProductForm}
      status={status}
      templates={workspaceData.templates}
    />
  )
}
