import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Trash2Icon } from "lucide-react"
import { useCallback } from "react"

import { categoryLabel } from "./model"
import type { DeleteTarget } from "./types"

export function DeleteConfirmationDialog({
  target,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget | null
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const isCategory = target?.type === "category"
  const targetCategoryKind =
    target?.type === "category"
      ? (target.category.kind ?? "collection")
      : "collection"
  const targetLabel = isCategory ? categoryLabel(targetCategoryKind) : "product"
  const name =
    target?.type === "category"
      ? target.category.name
      : (target?.product.name ?? "")
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open && !isDeleting) {
        onCancel()
      }
    },
    [isDeleting, onCancel]
  )

  return (
    <AlertDialog open={target !== null} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {targetLabel}?</AlertDialogTitle>
          <AlertDialogDescription>
            {isCategory
              ? `This will hard delete "${name}" and everything stored under it from Convex and Cloudinary.`
              : `This will hard delete "${name}" and its images, options, and metadata from Convex and Cloudinary.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            <Trash2Icon />
            {isDeleting ? "Deleting" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
