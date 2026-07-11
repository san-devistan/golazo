import { cn } from "@workspace/ui/lib/utils"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

const DEFAULT_SCROLL_DISTANCE = 784
const MIN_SCROLLBAR_THUMB_WIDTH = 18

type ScrollMetrics = {
  canScroll: boolean
  canScrollNext: boolean
  canScrollPrevious: boolean
  thumbOffset: number
  thumbWidth: number
}

const INITIAL_SCROLL_METRICS: ScrollMetrics = {
  canScroll: false,
  canScrollNext: false,
  canScrollPrevious: false,
  thumbOffset: 0,
  thumbWidth: 100,
}

export function OneLineScroll({
  ariaLabel,
  children,
  className,
  contentClassName,
  scrollDistance = DEFAULT_SCROLL_DISTANCE,
  viewportClassName,
}: {
  ariaLabel: string
  children: ReactNode
  className?: string
  contentClassName?: string
  scrollDistance?: number
  viewportClassName?: string
}) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const [metrics, setMetrics] = useState(INITIAL_SCROLL_METRICS)

  const syncScrollMetrics = useCallback(() => {
    const scroller = scrollerRef.current

    if (!scroller) {
      return
    }

    setMetrics(scrollMetricsForElement(scroller))
  }, [])
  const scrollPrevious = useCallback(() => {
    scrollerRef.current?.scrollBy({
      behavior: "smooth",
      left: -scrollDistance,
    })
  }, [scrollDistance])
  const scrollNext = useCallback(() => {
    scrollerRef.current?.scrollBy({
      behavior: "smooth",
      left: scrollDistance,
    })
  }, [scrollDistance])

  useEffect(() => {
    syncScrollMetrics()
    window.addEventListener("resize", syncScrollMetrics)

    return () => window.removeEventListener("resize", syncScrollMetrics)
  }, [children, syncScrollMetrics])

  return (
    <div className={cn("relative max-w-full min-w-0", className)}>
      {metrics.canScroll && (
        <OneLineScrollArrow
          direction="previous"
          disabled={!metrics.canScrollPrevious}
          onClick={scrollPrevious}
        />
      )}
      <OneLineScrollViewport
        ariaLabel={ariaLabel}
        className={viewportClassName}
        contentClassName={contentClassName}
        refObject={scrollerRef}
        onScroll={syncScrollMetrics}
      >
        {children}
      </OneLineScrollViewport>
      {metrics.canScroll && (
        <>
          <OneLineScrollArrow
            direction="next"
            disabled={!metrics.canScrollNext}
            onClick={scrollNext}
          />
          <OneLineScrollBar metrics={metrics} />
        </>
      )}
    </div>
  )
}

function OneLineScrollViewport({
  ariaLabel,
  children,
  className,
  contentClassName,
  refObject,
  onScroll,
}: {
  ariaLabel: string
  children: ReactNode
  className?: string
  contentClassName?: string
  refObject: RefObject<HTMLDivElement | null>
  onScroll: () => void
}) {
  return (
    <div
      ref={refObject}
      aria-label={ariaLabel}
      className={cn(
        "w-full max-w-full [scrollbar-width:none] overflow-x-auto px-0.5 pt-0.5 pb-1 [&::-webkit-scrollbar]:hidden",
        className
      )}
      onScroll={onScroll}
    >
      <div className={cn("flex w-max", contentClassName)}>{children}</div>
    </div>
  )
}

function OneLineScrollArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next"
  disabled: boolean
  onClick: () => void
}) {
  const isNext = direction === "next"
  const Icon = isNext ? ArrowRightIcon : ArrowLeftIcon

  return (
    <button
      type="button"
      aria-label={isNext ? "Show next items" : "Show previous items"}
      disabled={disabled}
      className={cn(
        "absolute top-[42%] z-10 grid size-10 -translate-y-1/2 place-items-center bg-transparent text-[#111] transition hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111] disabled:pointer-events-none disabled:opacity-25",
        isNext ? "right-1" : "left-1"
      )}
      onClick={onClick}
    >
      <Icon className="size-6" />
    </button>
  )
}

function OneLineScrollBar({ metrics }: { metrics: ScrollMetrics }) {
  const thumbStyle = useMemo(
    () => ({
      transform: `translate3d(${metrics.thumbOffset}%, 0, 0)`,
      width: `${metrics.thumbWidth}%`,
    }),
    [metrics.thumbOffset, metrics.thumbWidth]
  )

  return (
    <div aria-hidden="true" className="mt-3 h-1.5 bg-[#e5e5e5]">
      <div
        className="h-full bg-[#111] transition-transform"
        style={thumbStyle}
      />
    </div>
  )
}

function scrollMetricsForElement(scroller: HTMLDivElement): ScrollMetrics {
  const maxScrollLeft = Math.max(scroller.scrollWidth - scroller.clientWidth, 0)
  const canScroll = maxScrollLeft > 1

  if (!canScroll) {
    return INITIAL_SCROLL_METRICS
  }

  const thumbWidth = Math.max(
    MIN_SCROLLBAR_THUMB_WIDTH,
    (scroller.clientWidth / scroller.scrollWidth) * 100
  )
  const scrollProgress = scroller.scrollLeft / maxScrollLeft
  const thumbOffset = scrollProgress * (100 - thumbWidth)

  return {
    canScroll,
    canScrollNext: scroller.scrollLeft < maxScrollLeft - 1,
    canScrollPrevious: scroller.scrollLeft > 1,
    thumbOffset,
    thumbWidth,
  }
}
