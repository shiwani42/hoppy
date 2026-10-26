"use client";

import { useEffect } from "react";

/** Registers public/sw.js so Hoppy installs and opens offline (spec.md > Stack). */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const url = process.env.NODE_ENV === "production" ? "/sw.js" : "/sw.js?dev=1";
    navigator.serviceWorker.register(url, { scope: "/", updateViaCache: "none" }).catch(console.error);
  }, []);
  return null;
}
