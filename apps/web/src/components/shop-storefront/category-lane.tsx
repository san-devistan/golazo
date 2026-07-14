import { categoryHref } from "@/lib/catalog-navigation"
import { Link } from "@tanstack/react-router"
import { cn } from "@workspace/ui/lib/utils"
import { ArrowRightIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useCallback } from "react"

import {
  CardAdminOverlay,
  CardIconButton,
  AdminOrderIconButton,
} from "./admin-buttons"
import { moveByOffset, catalogNodeLabel, isHiddenCategory } from "./catalog"
import { CategoryVisibilityIconButton } from "./category-admin-controls"
import { CategoryLogo } from "./category-elements"
import type { StorefrontCategory, StorefrontMode } from "./types"

export function CategoryLane<TCategory extends StorefrontCategory>({
  mode,
  categories,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onReorderCategories,
}: {
  mode: StorefrontMode
  categories: Array<TCategory>
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
}) {
  const isAdmin = mode === "admin"

  return (
    <div className="grid gap-x-2 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {categories.map((category, index) => (
        <CategoryLaneCard
          key={category._id}
          category={category}
          categories={categories}
          index={index}
          isAdmin={isAdmin}
          mode={mode}
          onAddToCategory={onAddToCategory}
          onEditCategory={onEditCategory}
          onToggleCategoryVisibility={onToggleCategoryVisibility}
          onReorderCategories={onReorderCategories}
        />
      ))}
    </div>
  )
}

function CategoryLaneCard<TCategory extends StorefrontCategory>({
  category,
  categories,
  index,
  isAdmin,
  mode,
  onAddToCategory,
  onEditCategory,
  onToggleCategoryVisibility,
  onReorderCategories,
}: {
  category: TCategory
  categories: Array<TCategory>
  index: number
  isAdmin: boolean
  mode: StorefrontMode
  onAddToCategory?: (category: TCategory) => void
  onEditCategory?: (category: TCategory) => void
  onToggleCategoryVisibility?: (category: TCategory) => void
  onReorderCategories?: (orderedCategoryIds: Array<TCategory["_id"]>) => void
}) {
  const handleMovePrevious = useCallback(() => {
    onReorderCategories?.(
      moveByOffset(categories, index, -1).map((item) => item._id)
    )
  }, [categories, index, onReorderCategories])
  const handleMoveNext = useCallback(() => {
    onReorderCategories?.(
      moveByOffset(categories, index, 1).map((item) => item._id)
    )
  }, [categories, index, onReorderCategories])
  const handleEdit = useCallback(() => {
    onEditCategory?.(category)
  }, [category, onEditCategory])
  const handleAdd = useCallback(() => {
    onAddToCategory?.(category)
  }, [category, onAddToCategory])
  const nodeLabel = catalogNodeLabel(category)
  const isHidden = isHiddenCategory(category)

  return (
    <article className="group relative min-w-0 outline-none">
      <Link to={categoryHref(category, mode)} className="block">
        <div
          className={cn(
            "flex aspect-[4/5] flex-col bg-[#ededed] p-5 transition group-hover:bg-[#e3e3e3]",
            isAdmin && isHidden && "bg-[#d8d8d8] opacity-45 grayscale"
          )}
        >
          <CategoryLogo category={category} className="size-20" />
          <div className="mt-auto min-w-0 pr-8">
            <h2 className="font-oswald text-3xl leading-none font-black tracking-tight uppercase">
              {category.name}
            </h2>
          </div>
          <ArrowRightIcon className="absolute right-5 bottom-5 size-5 transition group-hover:translate-x-1" />
        </div>
      </Link>
      {isAdmin && onToggleCategoryVisibility && (
        <CategoryVisibilityIconButton
          category={category}
          className="group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100"
          onToggleCategoryVisibility={onToggleCategoryVisibility}
        />
      )}
      {isAdmin && (
        <CardAdminOverlay>
          {onReorderCategories && (
            <>
              <AdminOrderIconButton
                direction="left"
                label={`Move ${nodeLabel} left`}
                disabled={index === 0}
                onClick={handleMovePrevious}
              />
              <AdminOrderIconButton
                direction="right"
                label={`Move ${nodeLabel} right`}
                disabled={index === categories.length - 1}
                onClick={handleMoveNext}
              />
            </>
          )}
          {onAddToCategory && (
            <CardIconButton
              title={`Add to ${nodeLabel}`}
              variant="outline"
              onClick={handleAdd}
            >
              <PlusIcon />
            </CardIconButton>
          )}
          <CardIconButton
            title={`Edit ${nodeLabel}`}
            variant="outline"
            onClick={handleEdit}
          >
            <PencilIcon />
          </CardIconButton>
        </CardAdminOverlay>
      )}
    </article>
  )
}
