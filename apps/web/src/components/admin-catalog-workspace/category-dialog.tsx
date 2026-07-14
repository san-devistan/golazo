import { categoryHref } from "@/lib/catalog-navigation"
import { sortBySortOrder } from "@/lib/shop"
import { Link } from "@tanstack/react-router"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"
import { ImageUpIcon, Trash2Icon } from "lucide-react"
import {
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
} from "react"

import { EMPTY_ADMIN_CATEGORIES, PRODUCT_IMAGE_ACCEPT } from "./constants"
import { categoryKindForAdmin, categoryLabel, categoryTitle } from "./model"
import type { AdminCategory, CategoryFormState, CategoryId } from "./types"

type CategoryFormDispatch = Dispatch<SetStateAction<CategoryFormState | null>>

export function CategoryDialog({
  form,
  categories,
  groups,
  isUploading,
  onChange,
  onDelete,
  onUploadLogo,
}: {
  form: CategoryFormState | null
  categories: Array<AdminCategory>
  groups: Array<AdminCategory>
  isUploading: boolean
  onChange: CategoryFormDispatch
  onDelete: (categoryId: CategoryId) => void
  onUploadLogo: (file: File) => Promise<void>
}) {
  const groupCollections = useGroupCollections({ categories, form })
  const kind = form?.kind ?? "collection"
  const label = categoryLabel(kind)
  const title = categoryTitle(kind)
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onChange(null)
      }
    },
    [onChange]
  )
  const handleDelete = useCallback(() => {
    if (!form?.categoryId) {
      return
    }

    onDelete(form.categoryId)
    onChange(null)
  }, [form?.categoryId, onChange, onDelete])

  return (
    <Dialog open={form !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex-row items-center justify-between gap-3 pr-8">
          <DialogTitle>{form?.categoryId ? title : `Add ${title}`}</DialogTitle>
          {form?.categoryId && (
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              title={`Delete ${label}`}
              aria-label={`Delete ${label}`}
              onClick={handleDelete}
            >
              <Trash2Icon />
            </Button>
          )}
        </DialogHeader>
        {form && (
          <div className="space-y-4">
            <CategoryNameField form={form} onChange={onChange} />
            {kind === "collection" && (
              <>
                <CollectionLogoField
                  form={form}
                  isUploading={isUploading}
                  onChange={onChange}
                  onUploadLogo={onUploadLogo}
                />
                <CollectionGroupField
                  form={form}
                  groups={groups}
                  onChange={onChange}
                />
              </>
            )}
            {form.categoryId && kind === "group" && (
              <GroupCollectionsField collections={groupCollections} />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function useGroupCollections({
  categories,
  form,
}: {
  categories: Array<AdminCategory>
  form: CategoryFormState | null
}) {
  return useMemo(
    () =>
      form?.categoryId && form.kind === "group"
        ? sortBySortOrder(
            categories.filter(
              (category) =>
                category.parentId === form.categoryId &&
                categoryKindForAdmin(category, categories) === "collection"
            )
          )
        : EMPTY_ADMIN_CATEGORIES,
    [categories, form]
  )
}

function CategoryNameField({
  form,
  onChange,
}: {
  form: CategoryFormState
  onChange: CategoryFormDispatch
}) {
  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange((current) =>
        current ? { ...current, name: event.target.value } : current
      )
    },
    [onChange]
  )

  return (
    <div className="space-y-2">
      <Label htmlFor="category-name">Name</Label>
      <Input
        id="category-name"
        value={form.name}
        onChange={handleNameChange}
        placeholder={form.kind === "group" ? "National teams" : "Ligue 1"}
      />
    </div>
  )
}

function CollectionLogoField({
  form,
  isUploading,
  onChange,
  onUploadLogo,
}: {
  form: CategoryFormState
  isUploading: boolean
  onChange: CategoryFormDispatch
  onUploadLogo: (file: File) => Promise<void>
}) {
  const canUploadLogo = Boolean(form.categoryId) && !isUploading
  const hasLogo = Boolean(form.logoUrl.trim())
  const handleLogoFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (canUploadLogo) {
        const [file] = Array.from(event.target.files ?? [])
        if (file) {
          void onUploadLogo(file)
        }
      }

      event.target.value = ""
    },
    [canUploadLogo, onUploadLogo]
  )
  const handleRemoveLogo = useCallback(() => {
    onChange((current) => (current ? { ...current, logoUrl: "" } : current))
  }, [onChange])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor="collection-logo-file">Logo</Label>
        {hasLogo && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Remove logo"
            aria-label="Remove logo"
            onClick={handleRemoveLogo}
          >
            <Trash2Icon />
          </Button>
        )}
      </div>
      <label
        htmlFor="collection-logo-file"
        title={form.categoryId ? "Upload logo" : "Save before uploading a logo"}
        className={cn(
          "flex min-h-32 items-center justify-center rounded-lg border border-dashed border-input bg-muted/40 p-4 text-center transition",
          canUploadLogo
            ? "cursor-pointer hover:bg-muted"
            : "cursor-not-allowed opacity-60"
        )}
      >
        {hasLogo ? (
          <span className="flex h-24 w-full items-center justify-center">
            <img
              src={form.logoUrl}
              alt=""
              className="max-h-24 max-w-full object-contain"
            />
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ImageUpIcon className="size-4" />
            {isUploading ? "Uploading logo" : "Upload logo"}
          </span>
        )}
        <input
          id="collection-logo-file"
          type="file"
          aria-label="Upload collection logo"
          accept={PRODUCT_IMAGE_ACCEPT}
          className="sr-only"
          disabled={!canUploadLogo}
          onChange={handleLogoFileChange}
        />
      </label>
    </div>
  )
}

function CollectionGroupField({
  form,
  groups,
  onChange,
}: {
  form: CategoryFormState
  groups: Array<AdminCategory>
  onChange: CategoryFormDispatch
}) {
  const handleGroupChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const selectedGroupId = event.target.value

      onChange((current) => {
        if (!current || current.kind !== "collection") {
          return current
        }

        if (!selectedGroupId) {
          return { ...current, parentId: null }
        }

        const selectedGroup = groups.find(
          (group) => group._id === selectedGroupId
        )

        return selectedGroup
          ? { ...current, parentId: selectedGroup._id }
          : current
      })
    },
    [groups, onChange]
  )

  return (
    <div className="space-y-2">
      <Label htmlFor="collection-group">Group</Label>
      <select
        id="collection-group"
        aria-label="Collection group"
        value={form.parentId ?? ""}
        onChange={handleGroupChange}
        className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">No group</option>
        {groups.map((group) => (
          <option key={group._id} value={group._id}>
            {group.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function GroupCollectionsField({
  collections,
}: {
  collections: Array<AdminCategory>
}) {
  return (
    <div className="space-y-2">
      <Label>Collections</Label>
      {collections.length > 0 ? (
        <ul className="grid max-h-40 gap-1 overflow-y-auto">
          {collections.map((collection) => (
            <li key={collection._id}>
              <Link
                to={categoryHref(collection, "admin")}
                className="flex items-center justify-between gap-3 px-0 py-1.5 text-sm text-foreground transition hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0 truncate">{collection.name}</span>
                {!collection.isActive && (
                  <Badge variant="secondary">Hidden</Badge>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          No collections in this group.
        </div>
      )}
    </div>
  )
}
