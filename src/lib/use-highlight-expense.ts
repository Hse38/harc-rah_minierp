import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

function removeHighlightParam() {
  const url = new URL(window.location.href);
  url.searchParams.delete("highlight");
  window.history.replaceState(null, "", url.toString());
}

export function useHighlightExpense() {
  const searchParams = useSearchParams();
  const highlight = searchParams.get("highlight");

  useEffect(() => {
    if (!highlight) return;

    let tries = 0;
    const maxTries = 30;
    const intervalMs = 100;

    const tick = () => {
      tries += 1;
      const el = document.querySelector(
        `[data-expense-id="${CSS.escape(highlight)}"]`
      ) as HTMLElement | null;

      if (!el) {
        if (tries >= maxTries) {
          removeHighlightParam();
          return;
        }
        window.setTimeout(tick, intervalMs);
        return;
      }

      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("animate-highlight-flash");
      // force reflow so re-adding class replays animation
      void el.offsetWidth;
      el.classList.add("animate-highlight-flash");

      window.setTimeout(() => {
        el.classList.remove("animate-highlight-flash");
        removeHighlightParam();
      }, 1600);
    };

    tick();
  }, [highlight]);

  return highlight;
}

