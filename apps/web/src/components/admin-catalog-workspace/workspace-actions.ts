import type {
  AdminCategory,
  AdminOptionTemplate,
  AdminProductRecord,
  CategoryFormState,
  CategoryId,
  DeleteTarget,
  ProductFormState,
  ProductId,
} from "./types"
import type {
  CreateCollectionLogoUploadSignature,
  CreateProductImageUploadSignature,
  SetBoolean,
  SetCategoryForm,
  SetDeleteTarget,
  SetProductForm,
} from "./workspace-action-types"
import { useWorkspaceDeleteActions } from "./workspace-delete-actions"
import { useWorkspaceFormActions } from "./workspace-form-actions"
import { useWorkspaceReorderActions } from "./workspace-reorder-actions"
import { useWorkspaceUploadActions } from "./workspace-upload-actions"
import { useCategoryVisibilityActions } from "./workspace-visibility-actions"

export function useAdminCatalogWorkspaceActions({
  categories,
  categoryForm,
  childCategories,
  createCloudinaryUploadSignature,
  createCollectionLogoUploadSignature,
  currentCategory,
  currentCategoryKind,
  deleteCategory,
  deleteProduct,
  deleteTarget,
  directProductRecords,
  parentId,
  productForm,
  productRecords,
  productRecordsById,
  reorderCategories,
  reorderProducts,
  setCategoryForm,
  setCategoryVisibility,
  setDeleteTarget,
  setIsDeleting,
  setIsUploading,
  setProductForm,
  templates,
  isUploading,
}: {
  categories: Array<AdminCategory>
  categoryForm: CategoryFormState | null
  childCategories: Array<AdminCategory>
  createCloudinaryUploadSignature: CreateProductImageUploadSignature
  createCollectionLogoUploadSignature: CreateCollectionLogoUploadSignature
  currentCategory: AdminCategory | null
  currentCategoryKind: "collection" | "group" | null
  deleteCategory: (args: { categoryId: CategoryId }) => Promise<unknown>
  deleteProduct: (args: { productId: ProductId }) => Promise<unknown>
  deleteTarget: DeleteTarget | null
  directProductRecords: Array<AdminProductRecord>
  parentId: CategoryId | null
  productForm: ProductFormState | null
  productRecords: Array<AdminProductRecord>
  productRecordsById: Map<ProductId, AdminProductRecord>
  reorderCategories: (args: {
    parentId: CategoryId | null
    orderedCategoryIds: Array<CategoryId>
  }) => Promise<unknown>
  reorderProducts: (args: {
    categoryId: CategoryId
    orderedProductIds: Array<ProductId>
  }) => Promise<unknown>
  setCategoryForm: SetCategoryForm
  setCategoryVisibility: (args: {
    categoryId: CategoryId
    isActive: boolean
  }) => Promise<unknown>
  setDeleteTarget: SetDeleteTarget
  setIsDeleting: SetBoolean
  setIsUploading: SetBoolean
  setProductForm: SetProductForm
  templates: Array<AdminOptionTemplate>
  isUploading: boolean
}) {
  const reorderActions = useWorkspaceReorderActions({
    parentId,
    reorderCategories,
    reorderProducts,
  })
  const visibilityActions = useCategoryVisibilityActions({
    setCategoryVisibility,
  })
  const deleteActions = useWorkspaceDeleteActions({
    categories,
    currentCategory,
    deleteCategory,
    deleteProduct,
    deleteTarget,
    productRecordsById,
    setDeleteTarget,
    setIsDeleting,
  })
  const uploadActions = useWorkspaceUploadActions({
    categoryForm,
    createCloudinaryUploadSignature,
    createCollectionLogoUploadSignature,
    isUploading,
    productForm,
    setCategoryForm,
    setIsUploading,
    setProductForm,
  })
  const formActions = useWorkspaceFormActions({
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
  })

  return {
    ...deleteActions,
    ...formActions,
    ...reorderActions,
    ...uploadActions,
    handleToggleCategory: visibilityActions.handleToggleCategory,
  }
}
