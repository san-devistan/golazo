import { CustomerActions } from "@/components/customer-actions"
import { ShopHeaderMobileNavigation } from "@/components/shop-header-mobile-navigation"
import { ShopHeaderNavigation } from "@/components/shop-header-navigation"
import type {
  ShopHeaderCategory,
  ShopHeaderMode,
} from "@/components/shop-header-navigation-data"
import { Link } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { MenuIcon, SearchIcon } from "lucide-react"
import { useCallback, useState } from "react"

export type { ShopHeaderCategory } from "@/components/shop-header-navigation-data"

export function ShopHeader({
  categories,
  currentCategoryId,
  currentCategoryPath,
  adminMode = false,
}: {
  categories: Array<ShopHeaderCategory>
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  adminMode?: boolean
}) {
  const mode = adminMode ? "admin" : "public"
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-[#d9d9d9] bg-white text-[#111]">
      <div className="mx-auto flex max-w-[1536px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-10">
        <ShopHeaderMobileMenu
          categories={categories}
          currentCategoryId={currentCategoryId}
          currentCategoryPath={currentCategoryPath}
          mode={mode}
          open={isMobileMenuOpen}
          onOpenChange={setIsMobileMenuOpen}
        />
        <ShopHeaderBrand adminMode={adminMode} />
        <ShopHeaderNavigation
          categories={categories}
          currentCategoryId={currentCategoryId}
          currentCategoryPath={currentCategoryPath}
          mode={mode}
          className="hidden lg:block"
        />
        <ShopHeaderActions />
      </div>
    </header>
  )
}

function ShopHeaderBrand({ adminMode }: { adminMode: boolean }) {
  return (
    <Link
      to={adminMode ? "/admin" : "/"}
      aria-label="Golazo"
      className="flex min-w-0 items-center font-oswald text-4xl leading-none font-black tracking-tight whitespace-nowrap text-[#111] uppercase"
    >
      GOLAZO
    </Link>
  )
}

function ShopHeaderActions() {
  return (
    <div className="ml-auto flex min-w-0 items-center gap-2">
      <div className="hidden h-9 w-52 items-center bg-[#f1f1f1] px-3 lg:flex">
        <input
          aria-label="Search products"
          placeholder="Rechercher"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        />
        <SearchIcon className="size-5" />
      </div>
      <CustomerActions />
    </div>
  )
}

function ShopHeaderMobileMenu({
  categories,
  currentCategoryId,
  currentCategoryPath,
  mode,
  open,
  onOpenChange,
}: {
  categories: Array<ShopHeaderCategory>
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  mode: ShopHeaderMode
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const handleOpenMenu = useCallback(() => onOpenChange(true), [onOpenChange])
  const handleNavigate = useCallback(() => onOpenChange(false), [onOpenChange])

  if (categories.length === 0) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="rounded-none lg:hidden"
        onClick={handleOpenMenu}
      >
        <MenuIcon />
      </Button>
      <SheetContent side="left" className="gap-0 rounded-none p-0">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="font-oswald text-3xl leading-none font-black tracking-tight uppercase">
            Menu
          </SheetTitle>
        </SheetHeader>
        <ShopHeaderMobileNavigation
          categories={categories}
          currentCategoryId={currentCategoryId}
          currentCategoryPath={currentCategoryPath}
          mode={mode}
          onNavigate={handleNavigate}
        />
      </SheetContent>
    </Sheet>
  )
}
