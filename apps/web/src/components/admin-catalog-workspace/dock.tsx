import { Button } from "@workspace/ui/components/button"
import {
  EyeIcon,
  EyeOffIcon,
  FolderPlusIcon,
  PackagePlusIcon,
  PencilIcon,
  PlusIcon,
} from "lucide-react"
import { useCallback } from "react"

import type { AdminCategory } from "./types"

export function AdminCatalogDock({
  canAddCollection,
  canAddGroup,
  canAddProduct,
  collection,
  onAddCollection,
  onAddGroup,
  onAddProduct,
  onEditCollection,
  onToggleCollectionVisibility,
}: {
  canAddCollection: boolean
  canAddGroup: boolean
  canAddProduct: boolean
  collection: AdminCategory | null
  onAddCollection: () => void
  onAddGroup: () => void
  onAddProduct: () => void
  onEditCollection: (collection: AdminCategory) => void
  onToggleCollectionVisibility: (collection: AdminCategory) => void
}) {
  const handleEditCollection = useCallback(() => {
    if (collection) {
      onEditCollection(collection)
    }
  }, [collection, onEditCollection])
  const handleToggleCollectionVisibility = useCallback(() => {
    if (collection) {
      onToggleCollectionVisibility(collection)
    }
  }, [collection, onToggleCollectionVisibility])

  if (!canAddCollection && !canAddGroup && !canAddProduct) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
      <div className="flex items-center gap-1 border border-[#111] bg-white p-1 shadow-[0_16px_40px_rgb(0_0_0/0.16)]">
        {canAddCollection && (
          <Button
            type="button"
            className="rounded-none bg-[#111] text-white hover:bg-[#333]"
            onClick={onAddCollection}
          >
            <FolderPlusIcon />
            Collection
          </Button>
        )}
        {canAddGroup && (
          <Button
            type="button"
            variant="outline"
            className="rounded-none"
            onClick={onAddGroup}
          >
            <PlusIcon />
            Group
          </Button>
        )}
        {canAddProduct && (
          <Button
            type="button"
            className="rounded-none bg-[#111] text-white hover:bg-[#333]"
            onClick={onAddProduct}
          >
            <PackagePlusIcon />
            Product
          </Button>
        )}
        {collection && (
          <>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title="Edit collection"
              aria-label="Edit collection"
              className="rounded-none"
              onClick={handleEditCollection}
            >
              <PencilIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              title={
                collection.isActive ? "Hide collection" : "Show collection"
              }
              aria-label={
                collection.isActive ? "Hide collection" : "Show collection"
              }
              aria-pressed={collection.isActive}
              className="rounded-none"
              onClick={handleToggleCollectionVisibility}
            >
              {collection.isActive ? <EyeIcon /> : <EyeOffIcon />}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
