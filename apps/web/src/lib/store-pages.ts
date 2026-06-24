export type StorePageId =
  | "about"
  | "contact"
  | "faq"
  | "privacy"
  | "returns"
  | "shipping"
  | "size-guide"
  | "terms"

export type StorePageLink = {
  label: string
  pageId: StorePageId
}

export type StorePageSection = {
  title: string
  body: string
}

export type StorePage = {
  id: StorePageId
  eyebrow: string
  title: string
  summary: string
  sections: Array<StorePageSection>
}

export type StoreFooterSection = {
  title: string
  links: Array<StorePageLink>
}

export const STORE_FOOTER_SECTIONS: Array<StoreFooterSection> = [
  {
    title: "Help",
    links: [
      { label: "Shipping", pageId: "shipping" },
      { label: "Returns", pageId: "returns" },
      { label: "Size guide", pageId: "size-guide" },
      { label: "FAQ", pageId: "faq" },
      { label: "Contact", pageId: "contact" },
    ],
  },
  {
    title: "Company",
    links: [{ label: "About Golazo", pageId: "about" }],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy policy", pageId: "privacy" },
      { label: "Terms of service", pageId: "terms" },
    ],
  },
]

const STORE_PAGES: Record<StorePageId, StorePage> = {
  about: {
    id: "about",
    eyebrow: "Company",
    title: "About Golazo",
    summary:
      "A focused kit room for football shirts, match-day layers, and custom pieces built around clear product detail and straightforward checkout.",
    sections: [
      {
        title: "What we stock",
        body: "Golazo keeps the catalog tight: shirts, training pieces, fan essentials, and personalized products that fit the football wardrobe.",
      },
      {
        title: "How we work",
        body: "Product pages surface sizing, options, imagery, and price changes before checkout so every order starts with the right expectations.",
      },
    ],
  },
  contact: {
    id: "contact",
    eyebrow: "Help",
    title: "Contact",
    summary:
      "Use your account to follow order progress, and include your checkout email and order details when asking about a purchase.",
    sections: [
      {
        title: "Order questions",
        body: "Have the email used at checkout and any product names ready. That keeps order lookup and status checks fast.",
      },
      {
        title: "Product questions",
        body: "For fit, customization, or availability questions, include the product name and the size or option you are considering.",
      },
    ],
  },
  faq: {
    id: "faq",
    eyebrow: "Help",
    title: "FAQ",
    summary:
      "Answers to the common questions customers ask before and after buying from an online football kit shop.",
    sections: [
      {
        title: "Can I change an order?",
        body: "Changes are easiest before fulfillment begins. Personalized items may move into production quickly, so review names, numbers, sizes, and quantities before checkout.",
      },
      {
        title: "Where can I see my order?",
        body: "Signed-in customers can use the account page to review order history and current fulfillment status.",
      },
      {
        title: "How do sizes work?",
        body: "Use the size guide for a general fit reference, then check product-specific options before adding an item to the cart.",
      },
    ],
  },
  privacy: {
    id: "privacy",
    eyebrow: "Legal",
    title: "Privacy policy",
    summary:
      "A plain-language overview of the customer information an ecommerce store needs to operate checkout, accounts, and order support.",
    sections: [
      {
        title: "Information used for orders",
        body: "Checkout, account, contact, and shipping details are used to process payment, fulfill orders, provide receipts, and support customer requests.",
      },
      {
        title: "Service providers",
        body: "Payment, authentication, email, hosting, and backend providers may process the minimum information needed to run the store.",
      },
      {
        title: "Customer control",
        body: "Customers can review account information and order history from the account page when signed in.",
      },
    ],
  },
  returns: {
    id: "returns",
    eyebrow: "Help",
    title: "Returns",
    summary:
      "Keep items unworn, unused, and in their original condition while a return request is reviewed.",
    sections: [
      {
        title: "Return-ready items",
        body: "Standard products should be unworn, unused, and returned with original packaging or tags where applicable.",
      },
      {
        title: "Personalized products",
        body: "Customized names, numbers, or made-to-order configurations may not be eligible for return unless the item arrives incorrect or damaged.",
      },
      {
        title: "Refund timing",
        body: "Refunds are reviewed after the returned item is received and checked against the order details.",
      },
    ],
  },
  shipping: {
    id: "shipping",
    eyebrow: "Help",
    title: "Shipping",
    summary:
      "Shipping details are collected during checkout, then saved to the order so fulfillment and delivery updates stay tied to the purchase.",
    sections: [
      {
        title: "Delivery address",
        body: "Review the shipping address carefully during checkout. Orders are prepared against the address collected with the payment session.",
      },
      {
        title: "Order status",
        body: "Signed-in customers can check the account page for order and fulfillment status once checkout has completed.",
      },
      {
        title: "Split timing",
        body: "Personalized or configurable products can require extra handling before they are ready to ship.",
      },
    ],
  },
  "size-guide": {
    id: "size-guide",
    eyebrow: "Help",
    title: "Size guide",
    summary:
      "Use the guide as a fit starting point, then confirm each product option before adding it to your cart.",
    sections: [
      {
        title: "Choosing a size",
        body: "Compare your usual kit size with the product options shown on the product page. When between sizes, choose based on how close you want the fit.",
      },
      {
        title: "Personalized items",
        body: "Double-check size, name, number, and quantity together because customization can affect return eligibility.",
      },
      {
        title: "Youth and adult fits",
        body: "Use the unit switcher inside product size guides when available to compare metric and US references.",
      },
    ],
  },
  terms: {
    id: "terms",
    eyebrow: "Legal",
    title: "Terms of service",
    summary:
      "The basic store terms for browsing products, placing orders, using an account, and buying personalized goods.",
    sections: [
      {
        title: "Orders",
        body: "Submitting checkout starts order processing. Product availability, pricing, and configuration details are confirmed through the checkout flow.",
      },
      {
        title: "Accounts",
        body: "Account access is used for order history and customer details. Keep sign-in credentials secure and use the correct email at checkout.",
      },
      {
        title: "Product details",
        body: "Colors, images, sizing, and personalized previews should be reviewed before purchase because final items are prepared from the selected options.",
      },
    ],
  },
}

export function isStorePageId(value: string): value is StorePageId {
  return value in STORE_PAGES
}

export function getStorePage(pageId: StorePageId) {
  return STORE_PAGES[pageId]
}
