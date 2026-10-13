// Kept out of boot.tsx: a "use client" module can't export a plain string to
// the server layout.

const BOOT_KEY = "bs-boot";

/**
 * Runs before first paint: marks the document as script-enabled (`fx`) and
 * skips the boot screen after the first page of a session or for reduced motion.
 */
export const fxBootScript = `(function(){var h=document.documentElement;h.classList.add("fx");try{if(matchMedia("(prefers-reduced-motion: reduce)").matches||sessionStorage.getItem("${BOOT_KEY}"))h.classList.add("booted");sessionStorage.setItem("${BOOT_KEY}","1")}catch(e){h.classList.add("booted")}})()`;
