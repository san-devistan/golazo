import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon, ArrowRightIcon, Trash2Icon } from "lucide-react"
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
} from "react"

import {
  AdminOrderIconButton,
  CardIconButton,
  VisibilityIconButton,
} from "./admin-buttons"
import { isHiddenProduct } from "./catalog"
import type { StorefrontProduct } from "./types"

export function ProductCardGalleryControls({
  onNext,
  onPrevious,
}: {
  onNext: () => void
  onPrevious: () => void
}) {
  return (
    <div className="pointer-events-none absolute inset-x-2 top-1/2 z-20 flex -translate-y-1/2 items-center justify-between opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
      <ProductCardGalleryButton
        label="Show previous image"
        onClick={onPrevious}
      >
        <ArrowLeftIcon className="size-4" />
      </ProductCardGalleryButton>
      <ProductCardGalleryButton label="Show next image" onClick={onNext}>
        <ArrowRightIcon className="size-4" />
      </ProductCardGalleryButton>
    </div>
  )
}

function ProductCardGalleryButton({
  children,
  label,
  onClick,
}: {
  children: ReactNode
  label: string
  onClick: () => void
}) {
  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
    },
    []
  )
  const handleClick = useCallback(
    (event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (event.detail > 0) {
        event.currentTarget.blur()
        window.requestAnimationFrame(() => {
          const activeElement = document.activeElement

          if (activeElement instanceof HTMLElement) {
            activeElement.blur()
          }
        })
      }
      onClick()
    },
    [onClick]
  )

  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-9 place-items-center bg-transparent text-[#111] transition hover:text-black/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111]"
      onMouseDown={handleMouseDown}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}

export function ProductVisibilityIconButton<
  TProduct extends StorefrontProduct,
>({
  product,
  className,
  onToggleProductVisibility,
}: {
  product: TProduct
  className?: string
  onToggleProductVisibility: (product: TProduct) => void
}) {
  const isVisible = !isHiddenProduct(product)
  const title = isVisible ? "Hide product" : "Show product"
  const handleToggle = useCallback(() => {
    onToggleProductVisibility(product)
  }, [onToggleProductVisibility, product])

  return (
    <VisibilityIconButton
      isVisible={isVisible}
      title={title}
      className={cn(
        "group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100",
        className
      )}
      onClick={handleToggle}
    />
  )
}

export function ProductImageAdminControls<TProduct extends StorefrontProduct>({
  product,
  onDeleteProduct,
  canMovePrevious,
  canMoveNext,
  onMovePrevious,
  onMoveNext,
}: {
  product: TProduct
  onDeleteProduct?: (product: TProduct) => void
  canMovePrevious?: boolean
  canMoveNext?: boolean
  onMovePrevious?: () => void
  onMoveNext?: () => void
}) {
  const showOrderControls = onMovePrevious || onMoveNext
  const handleDelete = useCallback(() => {
    onDeleteProduct?.(product)
  }, [onDeleteProduct, product])

  if (!showOrderControls && !onDeleteProduct) {
    return null
  }

  return (
    <div className="pointer-events-none absolute right-2 bottom-2 z-10 flex items-center gap-1 opacity-0 transition group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-hover:pointer-events-auto group-hover:opacity-100">
      {showOrderControls && (
        <>
          <AdminOrderIconButton
            direction="left"
            label={`Move ${product.name} left`}
            disabled={!canMovePrevious}
            onClick={onMovePrevious}
          />
          <AdminOrderIconButton
            direction="right"
            label={`Move ${product.name} right`}
            disabled={!canMoveNext}
            onClick={onMoveNext}
          />
        </>
      )}
      {onDeleteProduct && (
        <CardIconButton
          title={`Delete ${product.name}`}
          variant="destructive"
          onClick={handleDelete}
        >
          <Trash2Icon />
        </CardIconButton>
      )}
    </div>
  )
}
