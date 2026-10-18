"use client";

import { useEffect } from "react";

/**
 * Global smooth button click ripple & tactile feedback provider.
 * Automatically attaches an elegant expanding glow ripple originating from
 * the exact click point across all buttons and user roles in Aventix.
 */
export default function ButtonClickEffect() {
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      // Only trigger on primary click (left mouse button / touch)
      if (e.button !== 0) return;

      // Respect reduced motion accessibility preference
      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      const rawTarget = e.target as HTMLElement | null;
      if (!rawTarget) return;

      // Match all interactive buttons, role="button", and button-styled links
      const button = rawTarget.closest<HTMLElement>(
        'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], a[class*="rounded"][class*="bg-"], a[class*="rounded-"][class*="bg-"], a[class*="rounded"][class*="border"], a[class*="rounded-"][class*="border"], a[class*="btn"], .btn'
      );

      if (!button) return;

      // Ignore disabled buttons or elements
      if (
        button.hasAttribute("disabled") ||
        button.getAttribute("aria-disabled") === "true" ||
        button.classList.contains("disabled") ||
        button.classList.contains("pointer-events-none")
      ) {
        return;
      }

      const rect = button.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Calculate radial dimension to cover entire button surface from click origin
      const diameter = Math.max(rect.width, rect.height) * 2.2;
      const radius = diameter / 2;

      const ripple = document.createElement("span");
      ripple.className = "aventix-click-ripple";
      ripple.setAttribute("aria-hidden", "true");

      const x = e.clientX - rect.left - radius;
      const y = e.clientY - rect.top - radius;

      ripple.style.width = `${diameter}px`;
      ripple.style.height = `${diameter}px`;
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;

      // Ensure positioning context without disrupting layout
      const computed = window.getComputedStyle(button);
      const originalPosition = button.style.position;
      const originalOverflow = button.style.overflow;

      if (computed.position === "static") {
        button.style.position = "relative";
      }

      if (computed.overflow !== "hidden") {
        button.style.overflow = "hidden";
      }

      button.appendChild(ripple);

      const cleanup = () => {
        if (ripple.parentNode === button) {
          ripple.remove();
        }
        // Only revert inline overrides if we changed them
        if (computed.position === "static" && button.style.position === "relative") {
          button.style.position = originalPosition;
        }
        if (computed.overflow !== "hidden" && button.style.overflow === "hidden") {
          button.style.overflow = originalOverflow;
        }
      };

      ripple.addEventListener("animationend", cleanup, { once: true });
      setTimeout(cleanup, 650);
    }

    document.addEventListener("pointerdown", handlePointerDown, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  return null;
}
