"use client";
import { useEffect } from "react";
import { canDiscardChanges, hasUnsavedChanges } from "@/lib/unsaved-changes";
export default function UnsavedChangesGuard() {
  useEffect(() => {
    const change = (e: Event) => {
      const field = e.target;
      if (!(field instanceof HTMLElement)) return;
      if (field.closest("[data-unsaved-ignore]")) return;
      const form = field.closest<HTMLFormElement>("form[data-protect-unsaved]");
      if (form) form.dataset.unsaved = "true";
    };
    const reset = (e: Event) => {
      if (e.target instanceof HTMLFormElement) delete e.target.dataset.unsaved;
    };
    const unload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const click = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element) || e.defaultPrevented) return;
      const link = target.closest<HTMLAnchorElement>("a[href]");
      if (
        !link ||
        e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0 ||
        link.target === "_blank" ||
        link.hasAttribute("download") ||
        link.getAttribute("href")?.startsWith("#")
      )
        return;
      if (!canDiscardChanges()) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    document.addEventListener("input", change, true);
    document.addEventListener("change", change, true);
    document.addEventListener("reset", reset, true);
    document.addEventListener("click", click, true);
    window.addEventListener("beforeunload", unload);
    return () => {
      document.removeEventListener("input", change, true);
      document.removeEventListener("change", change, true);
      document.removeEventListener("reset", reset, true);
      document.removeEventListener("click", click, true);
      window.removeEventListener("beforeunload", unload);
    };
  }, []);
  return null;
}
