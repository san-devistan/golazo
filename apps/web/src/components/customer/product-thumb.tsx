import { ShoppingBagIcon } from "lucide-react"

export function ProductThumb({
  imageUrl,
  name,
}: {
  imageUrl: string | null
  name: string
}) {
  return (
    <div className="grid size-20 shrink-0 place-items-center overflow-hidden bg-[#eceff1]">
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="size-full object-contain" />
      ) : (
        <ShoppingBagIcon className="size-5 text-muted-foreground" />
      )}
    </div>
  )
}
