import { formatPrice } from "@/lib/shop"
import { metadataLinkHref } from "@/routes/admin/orders/-helpers"
import type { AdminOrderRecord } from "@/routes/admin/orders/-types"
import { PackageIcon } from "lucide-react"

export function OrderItemRow({
  item,
}: {
  item: AdminOrderRecord["items"][number]
}) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 py-3 text-sm sm:grid-cols-[64px_minmax(0,1fr)_7rem] sm:items-start">
      <OrderItemThumbnail
        imageUrl={item.imageUrl}
        productName={item.productName}
        productSlug={item.productSlug}
      />
      <div className="min-w-0">
        <a
          href={`/products/${item.productSlug}`}
          className="font-medium hover:underline"
        >
          {item.productName}
        </a>
        {(item.configurationSummary.length > 0 || item.metadata.length > 0) && (
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {item.configurationSummary.map((summary) => (
              <span key={`${item._id}-${summary.label}`}>
                {summary.label}: {summary.value}
              </span>
            ))}
            <OrderItemMetadata metadata={item.metadata} />
          </div>
        )}
      </div>
      <OrderItemTotal
        currency={item.currency}
        quantity={item.quantity}
        totalCents={item.unitPriceCents * item.quantity}
      />
    </div>
  )
}

function OrderItemThumbnail({
  imageUrl,
  productName,
  productSlug,
}: {
  imageUrl: string | null
  productName: string
  productSlug: string
}) {
  return (
    <a
      href={`/products/${productSlug}`}
      className="grid size-16 place-items-center overflow-hidden bg-[#eceff1]"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={productName}
          className="size-full object-contain"
        />
      ) : (
        <PackageIcon className="size-5 text-muted-foreground" />
      )}
    </a>
  )
}

function OrderItemTotal({
  currency,
  quantity,
  totalCents,
}: {
  currency: string
  quantity: number
  totalCents: number
}) {
  return (
    <div className="font-medium sm:text-right">
      {formatPrice(totalCents, currency)}
      <div className="mt-1 text-xs font-normal text-muted-foreground">
        x {quantity}
      </div>
    </div>
  )
}

function OrderItemMetadata({
  metadata,
}: {
  metadata: AdminOrderRecord["items"][number]["metadata"]
}) {
  return metadata.map((item) => {
    const href = metadataLinkHref(item)

    if (!href) {
      return (
        <span key={item._id}>
          {item.label}: {item.value}
        </span>
      )
    }

    return (
      <span key={item._id}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-primary"
        >
          {item.label}
        </a>
      </span>
    )
  })
}
