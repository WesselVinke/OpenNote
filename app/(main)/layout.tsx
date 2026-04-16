"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { DndWrapper } from "@/components/dnd/dnd-wrapper";
import { Sidebar } from "@/components/sidebar/sidebar";
import { SearchDialog } from "@/components/search/search-dialog";
import { useWorkspaces } from "@/lib/hooks/use-workspaces";
import { useCreatePage } from "@/lib/hooks/use-pages";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useUIStore } from "@/lib/store/ui-store";
import { useIsMobile } from "@/lib/hooks/use-mobile";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: workspaces, isLoading } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const sidebarWidth = useUIStore((s) => s.sidebarWidth);
  const createPage = useCreatePage();
  const [sidebarPreviewOpen, setSidebarPreviewOpen] = useState(false);
  const previewCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();

  const clearSidebarPreviewClose = useCallback(() => {
    if (previewCloseTimeoutRef.current) {
      clearTimeout(previewCloseTimeoutRef.current);
      previewCloseTimeoutRef.current = null;
    }
  }, []);

  const openSidebarPreview = useCallback(() => {
    clearSidebarPreviewClose();
    setSidebarPreviewOpen(true);
  }, [clearSidebarPreviewClose]);

  const scheduleSidebarPreviewClose = useCallback(() => {
    clearSidebarPreviewClose();
    previewCloseTimeoutRef.current = setTimeout(() => {
      setSidebarPreviewOpen(false);
      previewCloseTimeoutRef.current = null;
    }, 120);
  }, [clearSidebarPreviewClose]);

  const handleOpenSidebar = useCallback(() => {
    clearSidebarPreviewClose();
    setSidebarPreviewOpen(false);
    setSidebarOpen(true);
  }, [clearSidebarPreviewClose, setSidebarOpen]);

  useEffect(() => {
    if (workspaces && (workspaces as unknown[]).length > 0 && !activeWorkspaceId) {
      const ws = (workspaces as { id: string }[])[0];
      setActiveWorkspaceId(ws.id);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId]);

  const handleNewPage = useCallback(async () => {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId;
    if (!wsId) return;
    const page = await createPage.mutateAsync({ workspaceId: wsId });
    router.push(`/${wsId}/${page.id}`);
  }, [createPage, router]);

  const handleNewDatabase = useCallback(async () => {
    const wsId = useWorkspaceStore.getState().activeWorkspaceId;
    if (!wsId) return;
    const page = await createPage.mutateAsync({
      workspaceId: wsId,
      type: "DATABASE",
      title: "Untitled Database",
      icon: "🗃️",
    });
    router.push(`/${wsId}/${page.id}`);
  }, [createPage, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "k") {
        e.preventDefault();
        useUIStore.getState().setSearchOpen(true);
      }
      if (mod && e.key === "\\") {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewDatabase();
      } else if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault();
        handleNewPage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewPage, handleNewDatabase]);

  // Listen for soft-navigation events from non-React code (e.g. TipTap slash commands)
  useEffect(() => {
    const handleNav = (e: Event) => {
      const url = (e as CustomEvent<string>).detail;
      if (url) router.push(url);
    };
    window.addEventListener("app:navigate", handleNav);
    return () => window.removeEventListener("app:navigate", handleNav);
  }, [router]);

  useEffect(() => {
    if (sidebarOpen) {
      clearSidebarPreviewClose();
      setSidebarPreviewOpen(false);
    }

    return clearSidebarPreviewClose;
  }, [sidebarOpen, clearSidebarPreviewClose]);

  // Close sidebar on mobile when viewport shrinks to mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  // Close sidebar on mobile when navigating
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (isMobile && pathname !== prevPathnameRef.current && sidebarOpen) {
      setSidebarOpen(false);
    }
    prevPathnameRef.current = pathname;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        {sidebarOpen && !isMobile && (
          <div style={{ width: sidebarWidth, minWidth: sidebarWidth }} className="border-r p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-6 w-2/3" />
          </div>
        )}
        <div className="flex-1 p-8">
          <Skeleton className="h-10 w-1/3 mb-4" />
          <Skeleton className="h-6 w-full mb-2" />
          <Skeleton className="h-6 w-4/5" />
        </div>
      </div>
    );
  }

  return (
    <DndWrapper>
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-[59] bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-[60] w-[280px] max-w-[85vw] animate-in slide-in-from-left duration-200">
            <Sidebar />
          </div>
        </>
      )}

      {/* Mobile hamburger button (when sidebar is closed) */}
      {isMobile && !sidebarOpen && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Open sidebar"
          className="fixed left-3 top-3 z-[60] h-10 w-10 rounded-full border-border/70 bg-background/95 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-background hover:text-foreground"
          onClick={() => setSidebarOpen(true)}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Desktop: sidebar closed — hover zone + preview */}
      {!isMobile && !sidebarOpen && (
        <div
          className="pointer-events-none fixed inset-y-0 left-0 z-[60]"
          style={{ width: Math.min(sidebarWidth, 336) + 24, maxWidth: "calc(100vw - 0.75rem)" }}
        >
          <div
            className="pointer-events-auto absolute inset-y-0 left-0 w-4"
            aria-hidden="true"
            onMouseEnter={openSidebarPreview}
            onMouseLeave={scheduleSidebarPreviewClose}
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Open sidebar"
            className="pointer-events-auto absolute left-3 top-3 z-10 h-10 w-10 rounded-full border-border/70 bg-background/95 text-muted-foreground shadow-lg backdrop-blur-md transition-colors hover:bg-background hover:text-foreground"
            onMouseEnter={openSidebarPreview}
            onMouseLeave={scheduleSidebarPreviewClose}
            onClick={handleOpenSidebar}
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          {sidebarPreviewOpen && (
            <div
              className="pointer-events-auto absolute left-3 top-14 bottom-3 animate-in fade-in slide-in-from-left-2 duration-150"
              style={{ width: Math.min(sidebarWidth, 336), maxWidth: "calc(100vw - 1.5rem)" }}
              onMouseEnter={openSidebarPreview}
              onMouseLeave={scheduleSidebarPreviewClose}
            >
              <Sidebar mode="preview" onRequestOpen={handleOpenSidebar} />
            </div>
          )}
        </div>
      )}

      {/* Desktop: sidebar open — docked */}
      {!isMobile && sidebarOpen && (
        <div
          style={{ width: sidebarWidth, minWidth: sidebarWidth }}
          className="h-full shrink-0"
        >
          <Sidebar />
        </div>
      )}

      <main className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
      <SearchDialog />
    </div>
    </DndWrapper>
  );
}
