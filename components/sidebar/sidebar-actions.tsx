"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useUIStore } from "@/lib/store/ui-store";
import { useCreatePage } from "@/lib/hooks/use-pages";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Search, FilePlus, Database, Trash2 } from "lucide-react";

export function SidebarActions() {
  const router = useRouter();
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const createPage = useCreatePage();

  const handleNewPage = async () => {
    if (!workspaceId) return;
    const page = await createPage.mutateAsync({ workspaceId });
    router.push(`/${workspaceId}/${page.id}`);
  };

  const handleNewDatabase = async () => {
    if (!workspaceId) return;
    const page = await createPage.mutateAsync({
      workspaceId,
      type: "DATABASE",
      title: "Untitled Database",
      icon: "🗃️",
    });
    router.push(`/${workspaceId}/${page.id}`);
  };

  return (
    <div className="px-2 pb-2 space-y-0.5">
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 h-8 px-2"
        onClick={() => setSearchOpen(true)}
      >
        <Search className="h-[18px] w-[18px] text-neutral-700 dark:text-neutral-400" />
        <span className="text-base font-medium text-neutral-700 dark:text-neutral-400 select-none">Search</span>
        <kbd className="ml-auto text-[10px] font-mono text-muted-foreground/50">⌘K</kbd>
      </Button>

      <div className="flex gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="flex-1 justify-start gap-2 h-8 px-2"
              onClick={handleNewPage}
              disabled={createPage.isPending}
            >
              <FilePlus className="h-[18px] w-[18px] text-neutral-700 dark:text-neutral-400" />
              <span className="text-base font-medium text-neutral-700 dark:text-neutral-400 select-none">New Page</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">New page (⌘N)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-neutral-700 dark:text-neutral-400"
              onClick={handleNewDatabase}
              disabled={createPage.isPending}
            >
              <Database className="h-[18px] w-[18px]" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">New database (⌘⇧N)</TooltipContent>
        </Tooltip>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start gap-2 h-8 px-2"
        onClick={() => workspaceId && router.push(`/${workspaceId}/trash`)}
      >
        <Trash2 className="h-[18px] w-[18px] text-neutral-700 dark:text-neutral-400" />
        <span className="text-base font-medium text-neutral-700 dark:text-neutral-400 select-none">Trash</span>
      </Button>
    </div>
  );
}
