import type { ShopHeaderProduct } from "@/components/shop-header-navigation-data"
import {
  ProductCard,
  type ProductCardMediaChrome,
  type ProductCardTextDensity,
  type StorefrontProduct,
} from "@/components/shop-storefront"
import {
  type ProductId as CustomerProductId,
  useCustomerState,
} from "@/lib/customer-state"

export type SearchProduct = Omit<ShopHeaderProduct, "_id"> & {
  _id: CustomerProductId
  description?: string
}

export function SearchProductCard({
  backHref,
  mediaChrome,
  product,
  textDensity,
}: {
  backHref: string
  mediaChrome?: ProductCardMediaChrome
  product: SearchProduct
  textDensity?: ProductCardTextDensity
}) {
  const customerState = useCustomerState()

  return (
    <ProductCard
      product={searchProductToStorefrontProduct(product)}
      currentPageHref={backHref}
      mode="public"
      customerState={customerState}
      textDensity={textDensity}
      mediaChrome={mediaChrome}
      className="group min-w-0 outline-[1.5px] outline-transparent transition focus-within:outline-[#111] hover:outline-[#111]"
    />
  )
}

function searchProductToStorefrontProduct(
  product: SearchProduct
): StorefrontProduct {
  return {
    _id: product._id,
    basePriceCents: product.basePriceCents,
    categoryId: product.categoryId,
    currency: product.currency,
    description: product.description ?? "",
    imageUrl: product.imageUrl,
    imageUrls: product.imageUrls,
    name: product.name,
    ...(product.slug ? { slug: product.slug } : {}),
    ...(product.sortOrder === undefined
      ? {}
      : { sortOrder: product.sortOrder }),
  }
}
