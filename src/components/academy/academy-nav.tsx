"use client";

import { useEffect, useRef } from "react";
import { PRACTICAL_ACADEMY_SECTIONS } from "@/lib/academy-practical-data";
import { cn } from "@/lib/utils";

interface AcademyNavProps {
  activeSection: string;
  onSelect: (id: string) => void;
  compactTopbar?: boolean;
}

export function getAcademyScrollOffset(): number {
  if (typeof window === "undefined") return 120;

  const headerEl = document.querySelector("[data-app-topbar]");
  const navEl = document.querySelector("[data-academy-nav]");
  const header =
    headerEl instanceof HTMLElement && headerEl.offsetHeight > 0 ? headerEl.offsetHeight : 0;
  const nav = navEl instanceof HTMLElement ? navEl.offsetHeight : 48;

  return header + nav + 8;
}

export function AcademyNav({
  activeSection,
  onSelect,
  compactTopbar = false,
}: AcademyNavProps) {
  const navBarRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function syncNavHeight() {
      const height = navBarRef.current?.offsetHeight ?? 0;
      document.documentElement.style.setProperty("--academy-nav-height", `${height}px`);
    }

    syncNavHeight();
    window.addEventListener("resize", syncNavHeight);

    const observer = new ResizeObserver(syncNavHeight);
    if (navBarRef.current) observer.observe(navBarRef.current);

    return () => {
      window.removeEventListener("resize", syncNavHeight);
      observer.disconnect();
      document.documentElement.style.setProperty("--academy-nav-height", "0px");
    };
  }, []);

  return (
    <>
      <div
        ref={navBarRef}
        data-academy-nav
        className={cn(
          "fixed inset-x-0 z-20 border-b border-[#ebebeb] bg-white lg:left-60 lg:border-b-0 lg:right-0 xl:left-64",
          compactTopbar ? "top-12 lg:top-0" : "top-[var(--app-header-height)]"
        )}
      >
        <div className="min-w-0 py-2">
          <nav
            aria-label="Разделы обучения"
            className="flex flex-wrap gap-2 px-4 md:px-6 lg:px-8"
          >
            {PRACTICAL_ACADEMY_SECTIONS.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  ref={isActive ? activeButtonRef : undefined}
                  type="button"
                  onClick={() => onSelect(section.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors md:text-base",
                    isActive
                      ? "bg-[var(--color-sunrise-coral)] text-white"
                      : "bg-[#f4f4f5] text-[#71717a] hover:bg-[#ebebeb] hover:text-[#18181b]"
                  )}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div
        className="shrink-0"
        style={{ height: "var(--academy-nav-height, 2.75rem)" }}
        aria-hidden
      />
    </>
  );
}
