const CART_ANIMATION_TARGET_SELECTOR = "[data-cart-animation-target]"
const ARC_LIFT_PX = 72
const ARC_VIEWPORT_PADDING_PX = 42
const FLIGHT_DURATION_MS = 520
const PARTICLE_SIZE_PX = 30
const TARGET_PULSE_DELAY_MS = 380

type Point = {
  x: number
  y: number
}

function rectCenter(rect: DOMRect): Point {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  }
}

function transformForPoint(point: Point, scale: number) {
  return `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%) scale(${scale})`
}

function interpolatedPoint(start: Point, end: Point, progress: number) {
  return {
    x: start.x + (end.x - start.x) * progress,
    y: start.y + (end.y - start.y) * progress,
  }
}

function pathPoint(start: Point, end: Point, progress: number): Point {
  const point = interpolatedPoint(start, end, progress)
  const lift = Math.sin(progress * Math.PI) * ARC_LIFT_PX

  return {
    x: point.x,
    y: Math.max(point.y - lift, ARC_VIEWPORT_PADDING_PX),
  }
}

function canAnimateCartFly(sourceRect: DOMRect, targetRect: DOMRect) {
  return (
    sourceRect.width > 0 &&
    sourceRect.height > 0 &&
    targetRect.width > 0 &&
    targetRect.height > 0 &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
}

function createCartFlyParticle() {
  const particle = document.createElement("div")
  const halo = document.createElement("div")
  const shine = document.createElement("div")
  const plusHorizontal = document.createElement("span")
  const plusVertical = document.createElement("span")

  particle.setAttribute("aria-hidden", "true")
  Object.assign(particle.style, {
    background: "#111",
    borderRadius: "9999px",
    boxShadow: "0 18px 32px rgb(0 0 0 / 0.28)",
    height: `${PARTICLE_SIZE_PX}px`,
    left: "0",
    overflow: "visible",
    pointerEvents: "none",
    position: "fixed",
    top: "0",
    width: `${PARTICLE_SIZE_PX}px`,
    zIndex: "2147483647",
  })
  Object.assign(halo.style, {
    background: "rgb(17 17 17 / 0.18)",
    borderRadius: "9999px",
    inset: "-8px",
    position: "absolute",
  })
  Object.assign(shine.style, {
    background: "white",
    borderRadius: "9999px",
    height: "6px",
    left: "8px",
    opacity: "0.82",
    position: "absolute",
    top: "7px",
    width: "6px",
  })
  Object.assign(plusHorizontal.style, {
    background: "white",
    borderRadius: "9999px",
    height: "3px",
    left: "9px",
    position: "absolute",
    top: "13.5px",
    width: "12px",
  })
  Object.assign(plusVertical.style, {
    background: "white",
    borderRadius: "9999px",
    height: "12px",
    left: "13.5px",
    position: "absolute",
    top: "9px",
    width: "3px",
  })
  particle.append(halo, shine, plusHorizontal, plusVertical)

  return particle
}

function animateCartTarget(targetElement: HTMLElement) {
  targetElement.animate(
    [
      { transform: "scale(1)" },
      { offset: 0.45, transform: "scale(1.2)" },
      { offset: 0.78, transform: "scale(0.96)" },
      { transform: "scale(1)" },
    ],
    {
      delay: TARGET_PULSE_DELAY_MS,
      duration: 420,
      easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    }
  )
}

export function animateAddToCart(sourceElement: HTMLElement) {
  const targetElement = document.querySelector<HTMLElement>(
    CART_ANIMATION_TARGET_SELECTOR
  )

  if (!targetElement) {
    return
  }

  const sourceRect = sourceElement.getBoundingClientRect()
  const targetRect = targetElement.getBoundingClientRect()

  if (!canAnimateCartFly(sourceRect, targetRect)) {
    return
  }

  const start = rectCenter(sourceRect)
  const end = rectCenter(targetRect)
  const particle = createCartFlyParticle()

  document.body.append(particle)
  const flight = particle.animate(
    [
      {
        opacity: 0,
        transform: transformForPoint(start, 0.52),
      },
      {
        offset: 0.14,
        opacity: 1,
        transform: transformForPoint(pathPoint(start, end, 0.14), 1.08),
      },
      {
        offset: 0.38,
        opacity: 1,
        transform: transformForPoint(pathPoint(start, end, 0.38), 0.98),
      },
      {
        offset: 0.64,
        opacity: 1,
        transform: transformForPoint(pathPoint(start, end, 0.64), 0.9),
      },
      {
        offset: 0.84,
        opacity: 0.92,
        transform: transformForPoint(pathPoint(start, end, 0.84), 0.72),
      },
      {
        opacity: 0,
        transform: transformForPoint(end, 0.4),
      },
    ],
    {
      duration: FLIGHT_DURATION_MS,
      easing: "linear",
      fill: "forwards",
    }
  )

  animateCartTarget(targetElement)
  flight.addEventListener("finish", () => particle.remove(), { once: true })
  flight.addEventListener("cancel", () => particle.remove(), { once: true })
}
