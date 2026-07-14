import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"
import { EyeIcon, EyeOffIcon, Trash2Icon } from "lucide-react"
import { useCallback } from "react"

import { ProductBasicsForm } from "./product-basics-form"
import { CloudinaryImageForm } from "./product-images-form"
import { ProductMetadataForm } from "./product-metadata-form"
import { TemplateActivationForm } from "./template-activation-form"
import type {
  AdminCategory,
  AdminOptionTemplate,
  ProductFormState,
  ProductId,
  ProductMetadataFormState,
} from "./types"

export function ProductDialog({
  form,
  templates,
  assignableCategories,
  isUploading,
  onChange,
  onDelete,
  onUploadImages,
}: {
  form: ProductFormState | null
  templates: Array<AdminOptionTemplate>
  assignableCategories: Array<AdminCategory>
  isUploading: boolean
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
  onDelete?: (productId: ProductId) => void
  onUploadImages: (files: Array<File>) => Promise<void>
}) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onChange(null)
      }
    },
    [onChange]
  )
  const handleMetadataChange = useCallback(
    (metadata: Array<ProductMetadataFormState>) => {
      onChange((current) => (current ? { ...current, metadata } : current))
    },
    [onChange]
  )
  const handleToggleVisibility = useCallback(() => {
    onChange((current) =>
      current
        ? {
            ...current,
            status: current.status === "published" ? "draft" : "published",
          }
        : current
    )
  }, [onChange])
  const handleDelete = useCallback(() => {
    if (!form?.productId || !onDelete) {
      return
    }

    onDelete(form.productId)
    onChange(null)
  }, [form?.productId, onChange, onDelete])
  const isPublished = form?.status === "published"
  const VisibilityIcon = isPublished ? EyeIcon : EyeOffIcon
  const visibilityLabel = isPublished ? "Hide product" : "Publish product"

  return (
    <Dialog open={form !== null} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader className="flex-row items-center justify-between gap-3 pr-8">
          <DialogTitle>Product</DialogTitle>
          {form?.productId && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                title={visibilityLabel}
                aria-label={visibilityLabel}
                aria-pressed={isPublished}
                onClick={handleToggleVisibility}
              >
                <VisibilityIcon />
              </Button>
              {onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  title="Delete product"
                  aria-label="Delete product"
                  onClick={handleDelete}
                >
                  <Trash2Icon />
                </Button>
              )}
            </div>
          )}
        </DialogHeader>
        {form && (
          <div className="space-y-6">
            <ProductBasicsForm
              form={form}
              assignableCategories={assignableCategories}
              onChange={onChange}
            />
            <CloudinaryImageForm
              form={form}
              isUploading={isUploading}
              onChange={onChange}
              onUploadImages={onUploadImages}
            />
            <TemplateActivationForm
              form={form}
              templates={templates}
              onChange={onChange}
            />
            <ProductMetadataForm
              metadata={form.metadata}
              onChange={handleMetadataChange}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
