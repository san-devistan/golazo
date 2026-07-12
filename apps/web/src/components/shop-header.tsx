import { CustomerActions } from "@/components/customer-actions"
import { LocaleCurrencySwitcher } from "@/components/locale-currency-switcher"
import { ShopHeaderMobileNavigation } from "@/components/shop-header-mobile-navigation"
import { ShopHeaderNavigation } from "@/components/shop-header-navigation"
import {
  EMPTY_HEADER_PRODUCTS,
  type ShopHeaderCategory,
  type ShopHeaderMode,
  type ShopHeaderProduct,
} from "@/components/shop-header-navigation-data"
import { ShopHeaderSearchDialog } from "@/components/shop-header-search-dialog"
import { useTranslation } from "@/lib/preferences"
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"
import { buttonVariants } from "@workspace/ui/lib/button-variants"
import { cn } from "@workspace/ui/lib/utils"
import {
  ClipboardListIcon,
  MailIcon,
  MenuIcon,
  SettingsIcon,
} from "lucide-react"
import { type ReactNode, useCallback, useState } from "react"

export type {
  ShopHeaderCategory,
  ShopHeaderProduct,
} from "@/components/shop-header-navigation-data"

export function ShopHeader({
  categories,
  currentCategoryId,
  currentCategoryPath,
  adminMode = false,
  products = EMPTY_HEADER_PRODUCTS,
}: {
  categories: Array<ShopHeaderCategory>
  currentCategoryId?: string | null
  currentCategoryPath?: string | null
  adminMode?: boolean
  products?: Array<ShopHeaderProduct>
}) {
  const mode = adminMode ? "admin" : "public"
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 bg-white text-[#111]">
      {!adminMode && (
        <div className="bg-black px-4 py-2 text-center font-oswald text-sm leading-none font-bold tracking-normal text-white uppercase">
          Free shipping worldwide
        </div>
      )}
      <div className="border-b border-[#dfdfdf]">
        <div className="relative mx-auto flex min-h-[68px] max-w-[1536px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:flex-nowrap lg:px-10">
          {!adminMode && (
            <ShopHeaderMobileMenu
              categories={categories}
              currentCategoryId={currentCategoryId}
              currentCategoryPath={currentCategoryPath}
              mode={mode}
              open={isMobileMenuOpen}
              onOpenChange={setIsMobileMenuOpen}
            />
          )}
          <ShopHeaderBrand adminMode={adminMode} />
          {!adminMode && (
            <ShopHeaderNavigation
              categories={categories}
              currentCategoryId={currentCategoryId}
              currentCategoryPath={currentCategoryPath}
              mode={mode}
              products={products}
              className="pointer-events-none absolute inset-x-0 hidden justify-center lg:flex"
            />
          )}
          {adminMode ? (
            <AdminHeaderActions />
          ) : (
            <ShopHeaderActions products={products} />
          )}
        </div>
      </div>
    </header>
  )
}

function ShopHeaderBrand({ adminMode }: { adminMode: boolean }) {
  return (
    <Link
      to={adminMode ? "/admin" : "/"}
      aria-label="Golazo"
      className="flex min-w-0 items-center font-oswald text-[2rem] leading-none font-black tracking-normal whitespace-nowrap text-[#111] uppercase"
    >
      GOLAZO
    </Link>
  )
}

function ShopHeaderActions({
  products,
}: {
  products: Array<ShopHeaderProduct>
}) {
  const t = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const routeSearchQuery = searchQueryFromLocationSearch(location.search)

  const handleSearch = useCallback(
    (query: string) => {
      void navigate({
        to: "/products",
        search: query ? { q: query } : {},
      })
    },
    [navigate]
  )

  return (
    <div className="ml-auto flex min-w-0 items-center gap-1">
      <ShopHeaderSearchDialog
        initialQuery={routeSearchQuery}
        label={t("searchProducts")}
        products={products}
        onSearch={handleSearch}
      />
      <LocaleCurrencySwitcher />
      <CustomerActions />
    </div>
  )
}

function AdminHeaderActions() {
  return (
    <div className="ml-auto flex min-w-0 items-center gap-1">
      <AdminHeaderActionLink
        to="/admin/settings"
        label="Product variant settings"
      >
        <SettingsIcon />
      </AdminHeaderActionLink>
      <AdminHeaderActionLink to="/admin/orders" label="Orders">
        <ClipboardListIcon />
      </AdminHeaderActionLink>
      <AdminHeaderActionLink to="/admin/emails" label="Email previews">
        <MailIcon />
      </AdminHeaderActionLink>
    </div>
  )
}

function AdminHeaderActionLink({
  children,
  label,
  to,
}: {
  children: ReactNode
  label: string
  to: "/admin/settings" | "/admin/orders" | "/admin/emails"
}) {
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon-lg" }),
        "rounded-none"
      )}
    >
      {children}
    </Link>
  )
}

function searchQueryFromLocationSearch(search: unknown) {
  if (!search || typeof search !== "object") {
    return ""
  }

  const query = Reflect.get(search, "q")

  return typeof query === "string" ? query : ""
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
  const t = useTranslation()

  if (categories.length === 0) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label={t("openNavigationMenu")}
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
            {t("menu")}
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
