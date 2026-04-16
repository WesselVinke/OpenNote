"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FileText, Database } from "lucide-react";

interface BreadcrumbItem {
  id: string;
  title: string;
  icon: string | null;
  type?: string;
}

interface PageBreadcrumbProps {
  items: BreadcrumbItem[];
  workspaceId: string;
}

type DisplayMode = "full" | "truncated" | "minimal" | "icons";

function getTruncatedTitle(title: string, mode: DisplayMode, maxChars?: number): string {
  const t = title || "Untitled";
  const first = t[0]?.toUpperCase() || "U";
  if (mode === "full") return t;
  if (mode === "truncated" && maxChars !== undefined && maxChars > 1) {
    const len = Math.min(maxChars, t.length);
    return t.length > len ? t.slice(0, len) + "..." : t;
  }
  if (mode === "minimal") return first + "...";
  return "";
}

function BreadcrumbIcon({ item }: { item: BreadcrumbItem }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
      {item.icon ? (
        item.icon
      ) : item.type === "DATABASE" ? (
        <Database className="h-5 w-5 text-neutral-700 dark:text-neutral-400" />
      ) : (
        <FileText className="h-5 w-5 text-neutral-700 dark:text-neutral-400" />
      )}
    </span>
  );
}

// Max width of breadcrumb - prevents full expansion when window is wide
const BREADCRUMB_MAX_WIDTH = "max-w-[230px]"; // ~60% of max-w-sm (384px)

// Approximate widths: icon ~20px, chevron ~12px, char ~7px, "..." ~18px
const ICON_WIDTH = 20;
const CHEVRON_WIDTH = 16;
const CHAR_WIDTH = 7;
const ELLIPSIS_WIDTH = 18;

function computeDisplayMode(
  containerWidth: number,
  items: BreadcrumbItem[],
  fullWidth: number
): { mode: DisplayMode; maxChars: number } {
  if (fullWidth <= containerWidth) return { mode: "full", maxChars: 99 };

  const n = items.length;
  const iconsAndChevronsWidth = n * ICON_WIDTH + (n - 1) * CHEVRON_WIDTH;

  // Icons-only width
  const iconsOnlyWidth = iconsAndChevronsWidth;
  if (containerWidth <= iconsOnlyWidth) return { mode: "icons", maxChars: 0 };

  // Minimal (first letter + ...) width per item
  const minimalTextWidth = (1 + 3) * CHAR_WIDTH + ELLIPSIS_WIDTH; // "X" + "..."
  const minimalTotalWidth = iconsAndChevronsWidth + n * minimalTextWidth;
  if (containerWidth <= minimalTotalWidth) return { mode: "icons", maxChars: 0 };

  // Truncated: available width for text, divided equally
  const availableForText = containerWidth - iconsAndChevronsWidth;
  const perItem = availableForText / n;
  // perItem = maxChars * CHAR_WIDTH + ELLIPSIS_WIDTH (when truncated)
  const maxChars = Math.max(1, Math.floor((perItem - ELLIPSIS_WIDTH) / CHAR_WIDTH));
  if (maxChars <= 1) return { mode: "minimal", maxChars: 1 };
  return { mode: "truncated", maxChars };
}

export function PageBreadcrumb({ items, workspaceId }: PageBreadcrumbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fullMeasureRef = useRef<HTMLDivElement>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("full");
  const [maxChars, setMaxChars] = useState(6);

  useEffect(() => {
    const container = containerRef.current;
    const fullMeasure = fullMeasureRef.current;
    if (!container || !fullMeasure || items.length === 0) return;

    const updateMode = () => {
      const containerWidth = container.clientWidth;
      const fullWidth = fullMeasure.scrollWidth;
      const { mode, maxChars: mc } = computeDisplayMode(containerWidth, items, fullWidth);
      setDisplayMode(mode);
      setMaxChars(mc);
    };

    const ro = new ResizeObserver(() => {
      requestAnimationFrame(updateMode);
    });
    ro.observe(container);
    updateMode();
    return () => ro.disconnect();
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className={`relative min-w-0 w-full overflow-hidden ${BREADCRUMB_MAX_WIDTH}`}>
      <nav
        className="flex min-h-8 min-w-0 items-center gap-1.5 text-base font-medium leading-none text-neutral-700 dark:text-neutral-400 select-none"
        aria-label="Breadcrumb"
      >
        {items.map((item, idx) => (
          <React.Fragment key={item.id}>
            {idx > 0 && <ChevronRight className="h-4 w-4 shrink-0" />}
            <span className="flex min-w-0 min-h-8 flex-1 items-center gap-1 overflow-hidden">
              {displayMode === "icons" ? (
                idx < items.length - 1 ? (
                  <Link
                    href={`/${workspaceId}/${item.id}`}
                    className="flex min-h-8 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-sm px-2 py-1 hover:bg-muted transition-colors cursor-pointer"
                    title={item.title || "Untitled"}
                  >
                    <BreadcrumbIcon item={item} />
                  </Link>
                ) : (
                  <span
                    className="flex min-h-8 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-sm px-2 py-1 hover:bg-muted transition-colors"
                    title={item.title || "Untitled"}
                  >
                    <BreadcrumbIcon item={item} />
                  </span>
                )
              ) : idx < items.length - 1 ? (
                <Link
                  href={`/${workspaceId}/${item.id}`}
                  className="flex min-h-8 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-sm px-2 py-1 hover:bg-muted transition-colors cursor-pointer"
                  title={item.title || "Untitled"}
                >
                  <BreadcrumbIcon item={item} />
                  <span className="min-w-0 flex-1 truncate leading-none">
                    {getTruncatedTitle(item.title || "Untitled", displayMode, maxChars)}
                  </span>
                </Link>
              ) : (
                <span className="flex min-h-8 min-w-0 flex-1 items-center gap-1 overflow-hidden rounded-sm px-2 py-1 hover:bg-muted transition-colors">
                  <BreadcrumbIcon item={item} />
                  <span className="min-w-0 flex-1 truncate leading-none">
                    {getTruncatedTitle(item.title || "Untitled", displayMode, maxChars)}
                  </span>
                </span>
              )}
            </span>
          </React.Fragment>
        ))}
      </nav>
      {/* Hidden div to measure full (untruncated) width */}
      <div
        ref={fullMeasureRef}
        className="invisible absolute whitespace-nowrap pointer-events-none flex items-center gap-1.5 text-base leading-none"
        aria-hidden
      >
        {items.map((item, idx) => (
          <span key={`measure-${item.id}`} className="flex items-center gap-1 shrink-0">
            {idx > 0 && <ChevronRight className="h-4 w-4 shrink-0" />}
            <BreadcrumbIcon item={item} />
            <span>{item.title || "Untitled"}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
