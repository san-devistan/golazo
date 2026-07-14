import { ShopStorefront } from "@/components/shop-storefront"

import { CategoryDialog } from "./category-dialog"
import { DeleteConfirmationDialog } from "./delete-dialog"
import { AdminCatalogDock } from "./dock"
import { ProductDialog } from "./product-dialog"
import { AdminCategoryUnavailable, BackendSetupState } from "./status"
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
import type { AdminCatalogQueryData } from "./workspace-data"

type WorkspaceViewActions = {
  handleAddCollection: () => void
  handleAddGroup: () => void
  handleAddProduct: () => void
  handleAddToCategory: (category: AdminCategory) => void
  handleCancelDelete: () => void
  handleConfirmDeleteClick: () => void
  handleDeleteCategoryById: (categoryId: CategoryId) => void
  handleDeleteProductById: (productId: ProductId) => void
  handleEditCategory: (category: AdminCategory) => void
  handleEditProduct: (product: AdminProductRecord["product"]) => void
  handleReorderCategoriesClick: (orderedCategoryIds: Array<CategoryId>) => void
  handleReorderProductsClick: (
    categoryId: CategoryId,
    orderedProductIds: Array<ProductId>
  ) => void
  handleToggleCategory: (category: AdminCategory) => void
  handleUploadCollectionLogo: (file: File) => Promise<void>
  handleUploadImages: (files: Array<File>) => Promise<void>
}

type WorkspaceDockAvailability = {
  canAddCollection: boolean
  canAddGroup: boolean
  canAddProduct: boolean
}

type WorkspaceStatus = {
  isDeleting: boolean
  isUploading: boolean
  showBackendSetupState: boolean
}

export function AdminCatalogWorkspaceView({
  actions,
  categories,
  categoryForm,
  categoryPath,
  childCategories,
  currentCategory,
  currentCategoryKind,
  data,
  deleteTarget,
  dockAvailability,
  groupCategories,
  pageProducts,
  productAssignableCategories,
  productForm,
  setCategoryForm,
  setProductForm,
  status,
  templates,
}: {
  actions: WorkspaceViewActions
  categories: Array<AdminCategory>
  categoryForm: CategoryFormState | null
  categoryPath?: string
  childCategories: Array<AdminCategory>
  currentCategory: AdminCategory | null
  currentCategoryKind: "collection" | "group" | null
  data: AdminCatalogQueryData
  deleteTarget: DeleteTarget | null
  dockAvailability: WorkspaceDockAvailability
  groupCategories: Array<AdminCategory>
  pageProducts: Array<AdminProductRecord["product"]>
  productAssignableCategories: Array<AdminCategory>
  productForm: ProductFormState | null
  setCategoryForm: React.Dispatch<
    React.SetStateAction<CategoryFormState | null>
  >
  setProductForm: React.Dispatch<React.SetStateAction<ProductFormState | null>>
  status: WorkspaceStatus
  templates: Array<AdminOptionTemplate>
}) {
  if (data === undefined) {
    return status.showBackendSetupState ? (
      <BackendSetupState />
    ) : (
      <AdminLoadingState />
    )
  }

  if (categoryPath && !currentCategory) {
    return <AdminCategoryUnavailable categories={categories} />
  }

  return (
    <>
      <ShopStorefront
        mode="admin"
        categories={categories}
        currentCategory={currentCategory}
        childCategories={childCategories}
        products={pageProducts}
        title={currentCategory?.name}
        onAddToCategory={actions.handleAddToCategory}
        onEditCategory={actions.handleEditCategory}
        onToggleCategoryVisibility={actions.handleToggleCategory}
        onEditProduct={actions.handleEditProduct}
        onReorderCategories={actions.handleReorderCategoriesClick}
        onReorderProducts={actions.handleReorderProductsClick}
      />
      <AdminCatalogDock
        canAddCollection={dockAvailability.canAddCollection}
        canAddGroup={dockAvailability.canAddGroup}
        canAddProduct={dockAvailability.canAddProduct}
        collection={
          currentCategoryKind === "collection" ? currentCategory : null
        }
        onAddCollection={actions.handleAddCollection}
        onAddGroup={actions.handleAddGroup}
        onAddProduct={actions.handleAddProduct}
        onEditCollection={actions.handleEditCategory}
        onToggleCollectionVisibility={actions.handleToggleCategory}
      />

      <CategoryDialog
        form={categoryForm}
        categories={categories}
        groups={groupCategories}
        isUploading={status.isUploading}
        onChange={setCategoryForm}
        onDelete={actions.handleDeleteCategoryById}
        onUploadLogo={actions.handleUploadCollectionLogo}
      />
      <ProductDialog
        form={productForm}
        templates={templates}
        assignableCategories={productAssignableCategories}
        isUploading={status.isUploading}
        onChange={setProductForm}
        onDelete={actions.handleDeleteProductById}
        onUploadImages={actions.handleUploadImages}
      />
      <DeleteConfirmationDialog
        target={deleteTarget}
        isDeleting={status.isDeleting}
        onCancel={actions.handleCancelDelete}
        onConfirm={actions.handleConfirmDeleteClick}
      />
    </>
  )
}

function AdminLoadingState() {
  return (
    <main className="min-h-svh bg-muted p-6">
      <div className="mx-auto h-[42rem] max-w-7xl animate-pulse rounded-lg bg-background" />
    </main>
  )
}
