"use client";

import { WorkspaceSwitcher } from "./workspace-switcher";
import { UserMenu } from "./user-menu";
import { PageTree } from "./page-tree";
import { FavoritesSection } from "./favorites-section";
import { SidebarActions } from "./sidebar-actions";
import { ResizeHandle } from "./resize-handle";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { PanelLeft, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/store/ui-store";

interface SidebarProps {
  mode?: "docked" | "preview";
  onRequestOpen?: () => void;
}

export function Sidebar({ mode = "docked", onRequestOpen }: SidebarProps) {
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const isPreview = mode === "preview";

  const handleSidebarButtonClick = () => {
    if (isPreview) {
      if (onRequestOpen) {
        onRequestOpen();
        return;
      }

      setSidebarOpen(true);
      return;
    }

    toggleSidebar();
  };

  return (
    <div
      className={cn(
        "relative flex h-full flex-col bg-sidebar-background text-sidebar-foreground select-none",
        isPreview
          ? "overflow-hidden rounded-2xl border border-sidebar-border/80 bg-sidebar-background/95 shadow-2xl backdrop-blur-xl"
          : "border-r"
      )}
    >
      <div className="flex items-center justify-between p-3">
        <WorkspaceSwitcher />
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label={isPreview ? "Open sidebar" : "Hide sidebar"}
                onClick={handleSidebarButtonClick}
              >
                {isPreview ? (
                  <PanelLeft className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isPreview ? "Keep sidebar open" : "Hide sidebar (⌘\\)"}
            </TooltipContent>
          </Tooltip>
          <UserMenu />
        </div>
      </div>

      <SidebarActions />

      <div className="mx-3 border-b border-sidebar-border/30" />

      <ScrollArea className="flex-1">
        <div className="p-2">
          <FavoritesSection />
          <div className="mt-2">
            <PageTree />
          </div>
        </div>
      </ScrollArea>

      {!isPreview && <ResizeHandle />}
    </div>
  );
}
