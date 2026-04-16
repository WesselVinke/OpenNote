"use client";

import { useCallback, useRef } from "react";
import { useUIStore } from "@/lib/store/ui-store";
import { SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from "@/lib/utils/constants";

export function ResizeHandle() {
  const setSidebarWidth = useUIStore((s) => s.setSidebarWidth);
  const isResizing = useRef(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isResizing.current = true;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizing.current) return;
        const newWidth = Math.min(
          Math.max(moveEvent.clientX, SIDEBAR_MIN_WIDTH),
          SIDEBAR_MAX_WIDTH
        );
        setSidebarWidth(newWidth);
      };

      const handleMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [setSidebarWidth]
  );

  return (
    <div
      onMouseDown={handleMouseDown}
      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/10 active:bg-primary/20 transition-colors"
    />
  );
}
