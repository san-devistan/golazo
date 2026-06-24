import {
  groupCategoriesByParentId,
  type ShopHeaderCategory,
} from "@/components/shop-header-navigation-data"
import { categoryHref } from "@/lib/catalog-navigation"
import { STORE_FOOTER_SECTIONS, type StorePageLink } from "@/lib/store-pages"
import { Link } from "@tanstack/react-router"
import {
  ArrowUpRightIcon,
  RotateCcwIcon,
  ShieldCheckIcon,
  TruckIcon,
} from "lucide-react"
import { type ReactNode, useMemo } from "react"

const MAX_FOOTER_CATEGORIES = 6

const FOOTER_PROMISES = [
  {
    label: "Secure checkout",
    icon: ShieldCheckIcon,
  },
  {
    label: "Tracked shipping",
    icon: TruckIcon,
  },
  {
    label: "Easy returns",
    icon: RotateCcwIcon,
  },
] as const

export function ShopFooter({
  categories,
}: {
  categories: Array<ShopHeaderCategory>
}) {
  const primaryCategories = useMemo(() => {
    const categoriesByParentId = groupCategoriesByParentId(categories)

    return categoriesByParentId.get(null)?.slice(0, MAX_FOOTER_CATEGORIES) ?? []
  }, [categories])

  return (
    <footer className="bg-[#111] text-white">
      <div className="mx-auto grid max-w-[1536px] gap-10 px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
        <div className="grid gap-8 border-b border-white/15 pb-10 lg:grid-cols-[minmax(220px,1.2fr)_minmax(0,2fr)] lg:gap-12">
          <div className="grid content-start gap-4">
            <Link
              to="/"
              aria-label="Golazo home"
              className="w-fit font-oswald text-5xl leading-none font-black tracking-tight uppercase"
            >
              GOLAZO
            </Link>
            <p className="max-w-sm text-sm leading-6 text-white/65">
              Football kits, custom pieces, and match-day essentials with the
              details customers need before checkout.
            </p>
            <FooterPromises />
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FooterColumn title="Shop">
              <FooterRouterLink to="/">All products</FooterRouterLink>
              <FooterRouterLink to="/account">Account</FooterRouterLink>
              {primaryCategories.map((category) => (
                <FooterRouterLink
                  key={category._id}
                  to={categoryHref(category, "public")}
                >
                  {category.name}
                </FooterRouterLink>
              ))}
            </FooterColumn>

            {STORE_FOOTER_SECTIONS.map((section) => (
              <FooterColumn key={section.title} title={section.title}>
                {section.links.map((link) => (
                  <FooterStorePageLink key={link.pageId} link={link} />
                ))}
              </FooterColumn>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>Golazo Kit Room</p>
          <p className="font-oswald text-sm tracking-wide text-[#a7f432] uppercase">
            Kit room open online
          </p>
        </div>
      </div>
    </footer>
  )
}

function FooterPromises() {
  return (
    <div className="grid gap-2 text-sm text-white/75 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
      {FOOTER_PROMISES.map((promise) => (
        <FooterPromiseItem key={promise.label} promise={promise} />
      ))}
    </div>
  )
}

function FooterPromiseItem({
  promise,
}: {
  promise: (typeof FOOTER_PROMISES)[number]
}) {
  const Icon = promise.icon

  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-[#a7f432]" />
      <span>{promise.label}</span>
    </div>
  )
}

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <nav aria-label={title} className="grid content-start gap-3">
      <h2 className="font-oswald text-sm font-bold tracking-wide text-white uppercase">
        {title}
      </h2>
      <div className="grid gap-2 text-sm">{children}</div>
    </nav>
  )
}

function FooterStorePageLink({ link }: { link: StorePageLink }) {
  const params = useMemo(() => ({ pageId: link.pageId }), [link.pageId])

  return (
    <FooterRouterLink to="/pages/$pageId" params={params}>
      {link.label}
    </FooterRouterLink>
  )
}

function FooterRouterLink({
  children,
  params,
  to,
}: {
  children: ReactNode
  params?: Record<string, string>
  to: string
}) {
  return (
    <Link
      to={to}
      params={params}
      className="group inline-flex w-fit items-center gap-1.5 text-white/70 transition hover:text-white focus-visible:ring-3 focus-visible:ring-[#a7f432]/60 focus-visible:outline-none"
    >
      <span>{children}</span>
      <ArrowUpRightIcon className="size-3.5 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
    </Link>
  )
}
