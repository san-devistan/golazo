import {
  productMetadataLinkHref,
  productMetadataLinkLabel,
} from "@/components/product-detail-model"
import type {
  ProductDetailImage,
  ProductMetadata,
} from "@/components/product-detail-types"
import { WishlistHeartButton } from "@/components/wishlist-heart-button"
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
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Separator } from "@workspace/ui/components/separator"
import { cn } from "@workspace/ui/lib/utils"
import {
  ExternalLinkIcon,
  MinusIcon,
  PencilIcon,
  PlusIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  ShoppingCartIcon,
  Trash2Icon,
  TruckIcon,
} from "lucide-react"
import { type MouseEvent, useCallback } from "react"

const PRODUCT_TRUST_SIGNALS = [
  { label: "Free shipping worldwide", icon: TruckIcon },
  { label: "Satisfied or refunded", icon: RotateCcwIcon },
  { label: "Secure checkout", icon: ShieldCheckIcon },
] as const

export function ProductAsideHeader({
  className,
  price,
  productName,
}: {
  className?: string
  price: string
  productName: string
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0 space-y-3">
        <h1 className="font-oswald text-3xl leading-none font-bold tracking-normal uppercase">
          {productName}
        </h1>
        <div className="font-oswald text-base font-medium tracking-normal">
          {price}
        </div>
      </div>
    </div>
  )
}

export function ProductMetadataList({
  metadata,
}: {
  metadata: Array<ProductMetadata>
}) {
  if (metadata.length === 0) return null

  return (
    <>
      <Separator className="my-5" />
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {metadata.map((item) => (
          <ProductMetadataItem key={item._id} item={item} />
        ))}
      </dl>
    </>
  )
}

function ProductMetadataItem({ item }: { item: ProductMetadata }) {
  return (
    <div
      className={cn(
        "bg-[#eef1f3] p-3",
        item.showOnProductPage === false &&
          "border border-dashed border-muted-foreground/40 bg-muted/50"
      )}
    >
      <dt className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="min-w-0 truncate">{item.label}</span>
        {item.showOnProductPage === false && (
          <Badge variant="outline" className="h-4 px-1.5">
            Hidden
          </Badge>
        )}
      </dt>
      <dd className="mt-1 font-medium">
        <ProductMetadataValue item={item} />
      </dd>
    </div>
  )
}

function ProductMetadataValue({ item }: { item: ProductMetadata }) {
  const href = productMetadataLinkHref(
    item.type === "link" ? item.value : item.linkUrl
  )

  if (!href) return <>{item.value}</>

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={href}
      className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-sm font-semibold text-foreground transition hover:border-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <ExternalLinkIcon className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{productMetadataLinkLabel(href)}</span>
    </a>
  )
}

export function ProductPurchaseActions({
  addToCartLabel,
  isFavorite,
  quantity,
  onAddToCart,
  onQuantityChange,
  onToggleWishlist,
}: {
  addToCartLabel: string
  isFavorite: boolean
  quantity: number
  onAddToCart: (sourceElement: HTMLElement) => void
  onQuantityChange: (quantity: number) => void
  onToggleWishlist: () => void
}) {
  const handleAddToCartClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      onAddToCart(event.currentTarget)
    },
    [onAddToCart]
  )

  return (
    <div className="mt-8 grid grid-cols-[minmax(0,1fr)_56px] gap-x-3 gap-y-5">
      <div className="col-span-full text-sm font-medium">Quantity</div>
      <div className="col-span-full w-auto">
        <QuantityControl quantity={quantity} onChange={onQuantityChange} />
      </div>
      <Button
        type="button"
        onClick={handleAddToCartClick}
        className="h-14 justify-between rounded-none px-5 font-oswald text-base font-semibold tracking-normal"
      >
        <span>{addToCartLabel}</span>
        <span className="relative grid size-6 place-items-center">
          <ShoppingCartIcon className="size-5" />
          <PlusIcon className="absolute right-0 bottom-0 size-3 rounded-full bg-foreground text-background" />
        </span>
      </Button>
      <WishlistHeartButton
        isFavorite={isFavorite}
        className="size-14 rounded-none bg-transparent hover:bg-[#111] hover:text-white"
        iconClassName="size-6"
        onClick={onToggleWishlist}
      />
    </div>
  )
}

function QuantityControl({
  quantity,
  onChange,
}: {
  quantity: number
  onChange: (quantity: number) => void
}) {
  const handleDecrease = useCallback(() => {
    onChange(Math.max(1, quantity - 1))
  }, [onChange, quantity])
  const handleIncrease = useCallback(() => {
    onChange(quantity + 1)
  }, [onChange, quantity])

  return (
    <div className="inline-grid w-fit grid-cols-[44px_56px_44px] bg-[#eef1f3]">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={quantity <= 1}
        onClick={handleDecrease}
        className="grid size-11 place-items-center transition outline-none hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-[#111]/30 disabled:pointer-events-none disabled:opacity-40"
      >
        <MinusIcon className="size-4" />
      </button>
      <div className="grid h-11 place-items-center text-sm font-semibold">
        {quantity}
      </div>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={handleIncrease}
        className="grid size-11 place-items-center transition outline-none hover:bg-black/10 focus-visible:ring-2 focus-visible:ring-[#111]/30"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  )
}

export function ProductImageGallery({
  images,
  productName,
}: {
  images: Array<ProductDetailImage>
  productName: string
}) {
  if (images.length === 0) {
    return (
      <section className="min-w-0">
        <div className="flex aspect-[3/4] items-center justify-center bg-[#edf0f2] px-6 text-center text-sm text-black/55">
          No Cloudinary CDN image stored yet
        </div>
      </section>
    )
  }

  return (
    <section className="grid min-w-0 gap-1 sm:grid-cols-2">
      {images.map((image, index) => (
        <div
          key={image._id}
          className="aspect-[3/4] overflow-hidden bg-[#edf0f2]"
        >
          <img
            src={image.imageUrl}
            alt={index === 0 ? productName : ""}
            className="size-full object-cover object-top"
          />
        </div>
      ))}
    </section>
  )
}

export function ProductTrustSignals() {
  return (
    <ul className="mt-7 grid list-none grid-cols-3 gap-2 border-t border-black/15 p-0 pt-6 text-center text-[0.72rem] leading-tight text-black/55 sm:gap-4 sm:text-sm">
      {PRODUCT_TRUST_SIGNALS.map((signal) => {
        const Icon = signal.icon
        return (
          <li
            key={signal.label}
            className="grid min-w-0 content-start justify-items-center gap-2"
          >
            <Icon className="size-5 text-[#111]" />
            <span className="max-w-[9ch] text-balance sm:max-w-[12ch]">
              {signal.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function ProductAdminActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-none"
        onClick={onEdit}
      >
        <PencilIcon />
        Edit
      </Button>
      <Button
        type="button"
        size="sm"
        variant="destructive"
        className="rounded-none"
        onClick={onDelete}
      >
        <Trash2Icon />
        Delete
      </Button>
    </div>
  )
}

export function ProductDeleteDialog({
  productName,
  isOpen,
  isDeleting,
  onOpenChange,
  onConfirm,
}: {
  productName: string
  isOpen: boolean
  isDeleting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!isDeleting) onOpenChange(open)
    },
    [isDeleting, onOpenChange]
  )

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete product?</AlertDialogTitle>
          <AlertDialogDescription>
            This will delete "{productName}" and its images, options, and
            metadata from Convex and Cloudinary.
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
