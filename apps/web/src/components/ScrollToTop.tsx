import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const HEADER_OFFSET = 96;
const MAX_HASH_FRAMES = 30;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function scrollToElementById(id: string, smooth: boolean) {
  const el = document.getElementById(id);
  if (!el) return false;

  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({
    top: Math.max(top, 0),
    left: 0,
    behavior: smooth ? "smooth" : "auto",
  });
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
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        return;
      }

      let cancelled = false;
      let frames = 0;
      const tick = () => {
        if (cancelled) return;
        frames += 1;
        if (scrollToElementById(id, smooth && !isInitial)) return;
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

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash, key, navigationType]);

  return null;
};

export default ScrollManager;
