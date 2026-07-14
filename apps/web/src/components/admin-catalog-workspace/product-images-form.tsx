import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  GripVerticalIcon,
  ImageUpIcon,
  Trash2Icon,
} from "lucide-react"
import { useCallback, useRef } from "react"

import { MAX_PRODUCT_IMAGE_COUNT, PRODUCT_IMAGE_ACCEPT } from "./constants"
import {
  moveProductImageBefore,
  moveProductImageByOffset,
} from "./image-upload"
import type { ProductFormState, ProductImageFormState } from "./types"

export function CloudinaryImageForm({
  form,
  isUploading,
  onChange,
  onUploadImages,
}: {
  form: ProductFormState
  isUploading: boolean
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
  onUploadImages: (files: Array<File>) => Promise<void>
}) {
  const draggedImageLocalIdRef = useRef<string | null>(null)
  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files ?? [])
      if (files.length > 0) {
        void onUploadImages(files)
      }
      event.target.value = ""
    },
    [onUploadImages]
  )

  return (
    <section>
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="font-medium">Images</h3>
        </div>
        <label className={buttonVariants({ variant: "outline", size: "sm" })}>
          <ImageUpIcon />
          {isUploading ? "Uploading" : "Upload images"}
          <input
            type="file"
            aria-label="Upload product images"
            accept={PRODUCT_IMAGE_ACCEPT}
            className="sr-only"
            disabled={isUploading}
            multiple
            onChange={handleFileChange}
          />
        </label>
      </div>
      {form.images.length === 0 ? (
        <div className="flex min-h-40 items-center justify-center rounded-lg bg-muted px-4 text-center text-sm text-muted-foreground">
          No images
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {form.images.map((image, index) => (
            <ProductImageTile
              key={image.localId}
              image={image}
              index={index}
              imageCount={form.images.length}
              isUploading={isUploading}
              draggedImageLocalIdRef={draggedImageLocalIdRef}
              onChange={onChange}
            />
          ))}
        </div>
      )}
      <div className="mt-3 text-xs text-muted-foreground">
        {form.images.length}/{MAX_PRODUCT_IMAGE_COUNT} images
      </div>
    </section>
  )
}

function ProductImageOrderButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "up" | "down"
  disabled: boolean
  onClick: () => void
}) {
  const Icon = direction === "up" ? ArrowUpIcon : ArrowDownIcon
  const label = direction === "up" ? "Move image up" : "Move image down"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon />
    </Button>
  )
}

function ProductImageTile({
  image,
  index,
  imageCount,
  isUploading,
  draggedImageLocalIdRef,
  onChange,
}: {
  image: ProductImageFormState
  index: number
  imageCount: number
  isUploading: boolean
  draggedImageLocalIdRef: React.MutableRefObject<string | null>
  onChange: React.Dispatch<React.SetStateAction<ProductFormState | null>>
}) {
  const handleDragStart = useCallback(() => {
    draggedImageLocalIdRef.current = image.localId
  }, [draggedImageLocalIdRef, image.localId])
  const handleDragEnd = useCallback(() => {
    draggedImageLocalIdRef.current = null
  }, [draggedImageLocalIdRef])
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
    },
    []
  )
  const handleDrop = useCallback(() => {
    const draggedImageLocalId = draggedImageLocalIdRef.current
    if (!draggedImageLocalId) return

    onChange((current) =>
      current
        ? {
            ...current,
            images: moveProductImageBefore(
              current.images,
              draggedImageLocalId,
              image.localId
            ),
          }
        : current
    )
    draggedImageLocalIdRef.current = null
  }, [draggedImageLocalIdRef, image.localId, onChange])
  const handleMoveUp = useCallback(() => {
    onChange((current) =>
      current
        ? {
            ...current,
            images: moveProductImageByOffset(current.images, index, -1),
          }
        : current
    )
  }, [index, onChange])
  const handleMoveDown = useCallback(() => {
    onChange((current) =>
      current
        ? {
            ...current,
            images: moveProductImageByOffset(current.images, index, 1),
          }
        : current
    )
  }, [index, onChange])
  const handleRemove = useCallback(() => {
    onChange((current) =>
      current
        ? {
            ...current,
            images: current.images.filter(
              (currentImage) => currentImage.localId !== image.localId
            ),
          }
        : current
    )
  }, [image.localId, onChange])

  return (
    <div
      draggable={!isUploading}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="group rounded-lg border bg-background p-2"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
        <img src={image.imageUrl} alt="" className="size-full object-cover" />
        {index === 0 && (
          <Badge className="absolute top-2 left-2 shadow-sm">Primary</Badge>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <GripVerticalIcon className="size-3.5 shrink-0" />
          <span>{index + 1}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ProductImageOrderButton
            direction="up"
            disabled={index === 0}
            onClick={handleMoveUp}
          />
          <ProductImageOrderButton
            direction="down"
            disabled={index === imageCount - 1}
            onClick={handleMoveDown}
          />
          <ProductImageRemoveButton onClick={handleRemove} />
        </div>
      </div>
    </div>
  )
}

function ProductImageRemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      title="Remove image"
      aria-label="Remove image"
      onClick={onClick}
    >
      <Trash2Icon />
    </Button>
  )
}
