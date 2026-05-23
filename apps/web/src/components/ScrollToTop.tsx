import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const FALLBACK_HEADER_OFFSET = 96;
const MAX_HASH_FRAMES = 30;
const INSTANT_SETTLE_DELAYS = [80, 240, 600];
const SMOOTH_SETTLE_DELAYS = [650, 1100];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function parseCssLength(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const amount = Number.parseFloat(trimmed);
  if (!Number.isFinite(amount)) return 0;

  if (trimmed.endsWith("rem")) {
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    return amount * (Number.isFinite(rootFontSize) ? rootFontSize : 16);
  }

  if (trimmed.endsWith("px")) return amount;

  return amount;
}

function getHeaderOffset() {
  const cssOffset = parseCssLength(
    getComputedStyle(document.documentElement).getPropertyValue("--landing-scroll-offset")
  );
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  const headerOffset = header ? Math.ceil(header.getBoundingClientRect().bottom + 20) : 0;

  return Math.max(cssOffset, headerOffset, FALLBACK_HEADER_OFFSET);
}

function scrollWindow(top: number, smooth: boolean) {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;

  if (!smooth) {
    root.style.scrollBehavior = "auto";
  }

  window.scrollTo({
    top,
    left: 0,
    behavior: smooth ? "smooth" : "auto",
  });

  if (!smooth) {
    requestAnimationFrame(() => {
      root.style.scrollBehavior = previousScrollBehavior;
    });
  }
}

function scrollToElementById(id: string, smooth: boolean) {
  const el = document.getElementById(id);
  if (!el) return false;

  const top = el.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
  scrollWindow(Math.max(top, 0), smooth);
  return true;
}

// Hash-aware scroll manager. Replaces the old ScrollToTop component.
// - When a route lands with a hash (e.g. /#about), waits a few frames for the
//   target section to mount, then scrolls to it (smooth unless reduced-motion).
// - On hash-less navigations driven by PUSH/REPLACE history events, scrolls to
//   the top so fresh routes don't preserve old scroll positions.
// - Leaves POP navigations (browser back/forward) alone so native scroll
//   restoration works.
const ScrollManager = () => {
  const { pathname, hash, key } = useLocation();
  const navigationType = useNavigationType();
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const smooth = !prefersReducedMotion();
    const isInitial = initialLoadRef.current;
    initialLoadRef.current = false;

    if (hash) {
      const id = decodeURIComponent(hash.slice(1));
      if (!id) {
        scrollWindow(0, false);
        return;
      }

      let cancelled = false;
      let frames = 0;
      const tick = () => {
        if (cancelled) return;
        frames += 1;
        const shouldSmoothScroll = smooth && !isInitial;
        if (scrollToElementById(id, shouldSmoothScroll)) {
          const settleDelays = shouldSmoothScroll ? SMOOTH_SETTLE_DELAYS : INSTANT_SETTLE_DELAYS;
          settleDelays.forEach((delay) => {
            window.setTimeout(() => {
              if (!cancelled) scrollToElementById(id, false);
            }, delay);
          });
          return;
        }
        if (frames < MAX_HASH_FRAMES) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      return () => {
        cancelled = true;
      };
    }

    if (navigationType === "POP") {
      // Let the browser's scroll restoration handle back/forward.
      return;
    }

    scrollWindow(0, false);
  }, [pathname, hash, key, navigationType]);

  return null;
};

export default ScrollManager;
