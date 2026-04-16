"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DragOverlay,
  closestCenter,
  useDndMonitor,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { usePageTree, useUpdatePage } from "@/lib/hooks/use-pages";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useDropStore } from "@/lib/store/drop-store";
import { PageTreeItem } from "./page-tree-item";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Database } from "lucide-react";

interface TreeNode {
  id: string;
  title: string;
  icon: string | null;
  type: string;
  parentId: string | null;
  isFavorite: boolean;
  sortOrder: number;
}

export function PageTree() {
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: pages, isLoading } = usePageTree(workspaceId);
  const updatePage = useUpdatePage();
  const setSidebarDropHandler = useDropStore((s) => s.setSidebarDropHandler);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  const rootPages = useMemo(() => {
    if (!pages) return [];
    return pages
      .filter((p) => !p.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [pages]);

  const childrenMap = useMemo(() => {
    if (!pages) return new Map<string, TreeNode[]>();
    const map = new Map<string, TreeNode[]>();
    for (const page of pages) {
      if (page.parentId) {
        const existing = map.get(page.parentId) || [];
        existing.push(page);
        map.set(page.parentId, existing);
      }
    }
    for (const [key, children] of map) {
      map.set(
        key,
        children.sort((a, b) => a.sortOrder - b.sortOrder)
      );
    }
    return map;
  }, [pages]);

  const handleDragEnd = useMemo(
    () => (event: { active: { id: unknown }; over: { id: unknown } | null }) => {
      const { active, over } = event;
      if (!over) return;

      const overId = String(over.id);
      const activeId = String(active.id);

      // Nest drop: dragging a page onto another page's nest zone
      if (overId.startsWith("nest-")) {
        const targetPageId = overId.replace("nest-", "");
        if (targetPageId === activeId) return; // can't nest into self
        // Prevent nesting into own descendants
        const isDescendant = (parentId: string, childId: string): boolean => {
          const kids = childrenMap.get(parentId) || [];
          return kids.some((k) => k.id === childId || isDescendant(k.id, childId));
        };
        if (isDescendant(activeId, targetPageId)) return;
        updatePage.mutate({ id: activeId, parentId: targetPageId });
        return;
      }

      if (active.id === over.id) return;

      const activeIdx = rootPages.findIndex((p) => p.id === active.id);
      const overIdx = rootPages.findIndex((p) => p.id === over.id);

      if (activeIdx === -1 || overIdx === -1) return;

      const newSortOrder =
        overIdx === 0
          ? rootPages[0].sortOrder - 1
          : overIdx === rootPages.length - 1
            ? rootPages[rootPages.length - 1].sortOrder + 1
            : (rootPages[overIdx - 1].sortOrder + rootPages[overIdx].sortOrder) / 2;

      updatePage.mutate({ id: active.id as string, sortOrder: newSortOrder });
    },
    [rootPages, childrenMap, updatePage]
  );

  useEffect(() => {
    setSidebarDropHandler(handleDragEnd);
    return () => setSidebarDropHandler(null);
  }, [handleDragEnd, setSidebarDropHandler]);

  useDndMonitor({
    onDragStart: (event) => {
      const id = event.active.id;
      if (rootPages.some((p) => p.id === id) || pages?.some((p) => p.id === id)) {
        setActivePageId(String(id));
      }
    },
    onDragEnd: () => setActivePageId(null),
    onDragCancel: () => setActivePageId(null),
  });

  const rootIds = rootPages.map((p) => p.id);
  const activePage = activePageId
    ? [...(pages ?? []), ...rootPages].find((p) => p.id === activePageId)
    : null;

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
            Pages
          </span>
        </div>
        <div className="space-y-1 px-2">
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-full" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-7 w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
          Pages
        </span>
      </div>
      <SortableContext items={rootIds} strategy={verticalListSortingStrategy}>
        {rootPages.map((page) => (
          <PageTreeItem
            key={page.id}
            page={page}
            childrenMap={childrenMap}
            level={0}
          />
        ))}
      </SortableContext>

      <DragOverlay dropAnimation={null}>
        {activePage ? (
          <div
            className="flex items-center gap-1.5 rounded-md bg-sidebar-accent px-2 py-1.5 text-sm shadow-lg"
            style={{ paddingLeft: 8 }}
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
              {activePage.icon ? (
                activePage.icon
              ) : activePage.type === "DATABASE" ? (
                <Database className="h-[18px] w-[18px] text-muted-foreground/70" />
              ) : (
                <FileText className="h-[18px] w-[18px] text-muted-foreground/70" />
              )}
            </span>
            <span className="truncate text-base font-medium text-neutral-700 dark:text-neutral-400 select-none">{activePage.title || "Untitled"}</span>
          </div>
        ) : null}
      </DragOverlay>

      {rootPages.length === 0 && (
        <p className="px-2 py-4 text-base font-medium text-neutral-700 dark:text-neutral-400 select-none text-center">
          No pages yet. Create one to get started.
        </p>
      )}
    </div>
  );
}
