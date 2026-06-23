function AccountLoading() {
  return (
    <div className="grid gap-6">
      <div className="h-28 animate-pulse bg-[#f1f1f1]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-24 animate-pulse bg-[#f1f1f1]" />
        <div className="h-24 animate-pulse bg-[#f1f1f1]" />
      </div>
    </div>
  )
}

export { AccountLoading }
