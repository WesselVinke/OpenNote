"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { usePage, usePageTree } from "@/lib/hooks/use-pages";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { PageHeader } from "@/components/page/page-header";
import { PageEditor } from "@/components/editor/page-editor";
import { PageBreadcrumb } from "@/components/page/breadcrumb";
import { DatabaseView } from "@/components/database/database-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function PageView() {
  const { workspaceId, pageId } = useParams<{
    workspaceId: string;
    pageId: string;
  }>();
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);
  const { data: page, isLoading } = usePage(pageId);
  const { data: tree } = usePageTree(workspaceId);

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId);
  }, [workspaceId, setActiveWorkspaceId]);

  const breadcrumbItems = useMemo(() => {
    if (!page || !tree) return [];
    const items: { id: string; title: string; icon: string | null; type: string }[] = [];
    let currentId = page.parentId;
    const treeMap = new Map(tree.map((p) => [p.id, p]));

    while (currentId) {
      const parent = treeMap.get(currentId);
      if (!parent) break;
      items.unshift({ id: parent.id, title: parent.title, icon: parent.icon, type: parent.type });
      currentId = parent.parentId;
    }
    items.push({ id: page.id, title: page.title, icon: page.icon, type: page.type });
    return items;
  }, [page, tree]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 md:px-6 md:py-12 space-y-4">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-6 w-3/5" />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-lg font-medium text-foreground">Page not found</p>
        <p className="text-sm">This page may have been deleted or moved.</p>
      </div>
    );
  }

  const isDatabase = page.type === "DATABASE";

  return (
    <div className="flex min-h-full min-w-0 flex-col pb-12 cursor-text [&_button]:cursor-pointer [&_[role='button']]:cursor-pointer [&_a]:cursor-pointer">
      <div className="sticky top-0 z-50 bg-background py-2">
        <div className="mx-auto w-full min-w-0 max-w-4xl px-4 md:pl-24 md:pr-6">
          <PageBreadcrumb items={breadcrumbItems} workspaceId={workspaceId} />
        </div>
      </div>

      <PageHeader page={page} />

      {isDatabase ? (
        <div className="mx-auto mt-6 w-full min-w-0 max-w-6xl px-4 md:px-6 flex-1 min-h-0 overflow-x-auto">
          <DatabaseView database={page} />
        </div>
      ) : (
        <div className="mx-auto mt-2 w-full min-w-0 max-w-4xl overflow-x-clip px-4 md:px-6 flex-1 min-h-0 flex flex-col">
          <PageEditor page={page} />
        </div>
      )}
    </div>
  );
}
