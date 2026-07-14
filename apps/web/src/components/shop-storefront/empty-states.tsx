export function AdminEmptyCollectionState({ label }: { label: string }) {
  return (
    <div className="border border-dashed border-[#d9d9d9] bg-[#fafafa] px-4 py-6 text-sm font-semibold text-[#777]">
      {label}
    </div>
  )
}

export function StorefrontSkeleton() {
  return (
    <div className="grid gap-x-2 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item}>
          <div className="aspect-square animate-pulse bg-[#eceff1]" />
          <div className="mt-3 h-4 w-24 animate-pulse bg-[#eceff1]" />
          <div className="mt-2 h-4 w-40 animate-pulse bg-[#eceff1]" />
        </div>
      ))}
    </div>
  )
}

export function EmptyShelf({ isCategoryPage }: { isCategoryPage: boolean }) {
  return (
    <div className="border border-[#d9d9d9] bg-[#f5f5f5] p-10 text-center">
      <h2 className="text-2xl font-black tracking-normal uppercase">
        {isCategoryPage
          ? "No products or collections yet"
          : "No collections or groups yet"}
      </h2>
    </div>
  )
}
