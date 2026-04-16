"use client";

import { useRouter } from "next/navigation";
import { usePageTree } from "@/lib/hooks/use-pages";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { FileText, Database } from "lucide-react";

export function FavoritesSection() {
  const router = useRouter();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const { data: pages } = usePageTree(workspaceId);

  const favorites = pages?.filter((p) => p.isFavorite) || [];

  if (favorites.length === 0) return null;

  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-2 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
          Favorites
        </span>
      </div>
      {favorites.map((page) => (
        <button
          key={page.id}
          onClick={() => router.push(`/${workspaceId}/${page.id}`)}
          className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 hover:bg-sidebar-accent transition-colors"
        >
          {page.icon ? (
            <span className="text-base">{page.icon}</span>
          ) : page.type === "DATABASE" ? (
            <Database className="h-[18px] w-[18px] text-muted-foreground/70" />
          ) : (
            <FileText className="h-[18px] w-[18px] text-muted-foreground/70" />
          )}
          <span className="truncate text-base font-medium text-neutral-700 dark:text-neutral-400 select-none">{page.title}</span>
        </button>
      ))}
    </div>
  );
}
