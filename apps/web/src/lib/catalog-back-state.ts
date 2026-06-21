const CATALOG_BACK_HREF_SEARCH_KEY = "back"

export function catalogBackHrefSearch(backHref: string) {
  return {
    [CATALOG_BACK_HREF_SEARCH_KEY]: backHref,
  }
}

export function readCatalogBackHrefSearch(search: unknown) {
  if (!search || typeof search !== "object") {
    return null
  }

  const href = Reflect.get(search, CATALOG_BACK_HREF_SEARCH_KEY)

  return readSafeCatalogBackHref(href)
}

function readSafeCatalogBackHref(value: unknown) {
  return isSafeInternalHref(value) ? value : null
}

function isSafeInternalHref(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  )
}
