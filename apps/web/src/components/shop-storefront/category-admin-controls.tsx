import { EyeIcon, EyeOffIcon, PencilIcon } from "lucide-react"
import { useCallback } from "react"

import {
  AdminOrderIconButton,
  CardIconButton,
  CategoryAddButton,
  VisibilityIconButton,
} from "./admin-buttons"
import { catalogNodeLabel } from "./catalog"
import type { StorefrontCategory } from "./types"

export function CategorySectionAdminControls<
  TCategory extends StorefrontCategory,
>({
  category,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  category: TCategory
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  canMovePrevious: boolean
  canMoveNext: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const showOrderControls = onMovePrevious || onMoveNext
  const nodeLabel = catalogNodeLabel(category)
  const handleEdit = useCallback(() => {
    onEditCategory?.(category)
  }, [category, onEditCategory])
  const handleAdd = useCallback(() => {
    onAddToCategory?.(category)
  }, [category, onAddToCategory])

  return (
    <div className="absolute top-0 right-0 flex items-center gap-1">
      {nodeLabel === "collection" && onAddToCategory && (
        <CategoryAddButton label="+ products" onClick={handleAdd} />
      )}
      {onEditCategory && (
        <CardIconButton
          title={`Edit ${nodeLabel}`}
          variant="outline"
          onClick={handleEdit}
        >
          <PencilIcon />
        </CardIconButton>
      )}
      {onToggleCategoryVisibility && (
        <CategoryLineVisibilityButton
          category={category}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
        />
      )}
      {showOrderControls && (
        <>
          <AdminOrderIconButton
            direction="up"
            label={`Move ${nodeLabel} up`}
            disabled={!canMovePrevious}
            onClick={onMovePrevious}
          />
          <AdminOrderIconButton
            direction="down"
            label={`Move ${nodeLabel} down`}
            disabled={!canMoveNext}
            onClick={onMoveNext}
          />
        </>
      )}
    </div>
  )
}

export function CategoryVisibilityIconButton<
  TCategory extends StorefrontCategory,
>({
  category,
  className,
  onToggleCategoryVisibility,
}: {
  category: TCategory
  className?: string
  onToggleCategoryVisibility: (category: TCategory) => void
}) {
  const isVisible = category.isActive ?? true
  const nodeLabel = catalogNodeLabel(category)
  const title = isVisible ? `Hide ${nodeLabel}` : `Show ${nodeLabel}`
  const handleToggle = useCallback(() => {
    onToggleCategoryVisibility(category)
  }, [category, onToggleCategoryVisibility])

  return (
    <VisibilityIconButton
      isVisible={isVisible}
      title={title}
      className={className}
      onClick={handleToggle}
    />
  )
}

function CategoryLineVisibilityButton<TCategory extends StorefrontCategory>({
  category,
  onToggleCategoryVisibility,
}: {
  category: TCategory
  onToggleCategoryVisibility: (category: TCategory) => void
}) {
  const isVisible = category.isActive ?? true
  const nodeLabel = catalogNodeLabel(category)
  const title = isVisible ? `Hide ${nodeLabel}` : `Show ${nodeLabel}`
  const Icon = isVisible ? EyeIcon : EyeOffIcon
  const handleToggle = useCallback(() => {
    onToggleCategoryVisibility(category)
  }, [category, onToggleCategoryVisibility])

  return (
    <CardIconButton title={title} variant="outline" onClick={handleToggle}>
      <Icon />
    </CardIconButton>
  )
}
