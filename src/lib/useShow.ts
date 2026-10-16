import { useEffect } from "react";

// Profile-page scroll choreography. Elements marked [data-show] get
// .is-shown once as they enter the viewport; things entering together are
// staggered via --stagger. Armed only after JS adds .show-on to <html>, so
// SSR, no-JS and reduced-motion visitors always see everything. Also drives
// a reading-progress bar (#read-progress) if the page has one. Separate from
// the home page's [data-reveal] system on purpose.
export function useShow(deps: unknown[] = []) {
  useEffect(() => {
    const root = document.documentElement;
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let io: IntersectionObserver | undefined;
    if (!still && "IntersectionObserver" in window) {
      root.classList.add("show-on");
      io = new IntersectionObserver(
        (entries) => {
          let n = 0;
          for (const e of entries) {
            if (!e.isIntersecting) continue;
            (e.target as HTMLElement).style.setProperty("--stagger", `${n++ * 110}ms`);
            e.target.classList.add("is-shown");
            io?.unobserve(e.target);
          }
        },
        { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
      );
      document.querySelectorAll("[data-show]").forEach((el) => io!.observe(el));
    }
    const bar = document.getElementById("read-progress");
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const max = root.scrollHeight - window.innerHeight;
        if (bar) bar.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io?.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      root.classList.remove("show-on");
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
