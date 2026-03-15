"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((r) => console.log("SW OK", r))
        .catch((e) => console.error("SW HATA", e));
    }
  }, []);
  return null;
}
