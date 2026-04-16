"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/lib/store/ui-store";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useSearch } from "@/lib/hooks/use-search";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Command } from "cmdk";
import { FileText, Database, Search, Clock, FileSearch, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SearchDialog() {
  const router = useRouter();
  const open = useUIStore((s) => s.searchOpen);
  const setOpen = useUIStore((s) => s.setSearchOpen);
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useSearch(workspaceId, query);

  const [recentPages, setRecentPages] = useState<typeof results>([]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    if (!workspaceId) return;
    fetch(`/api/search?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then(setRecentPages)
      .catch(() => {
        toast.error("Failed to load recent pages");
      });
  }, [open, workspaceId]);

  const handleSelect = (pageId: string) => {
    setOpen(false);
    router.push(`/${workspaceId}/${pageId}`);
  };

  const displayResults = query ? results : recentPages;
  const showRecent = !query && recentPages && recentPages.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="top-[15%] md:top-[20%] translate-y-0 p-0 gap-0 w-[calc(100vw-2rem)] md:w-full max-w-xl mx-auto">
        <DialogTitle className="sr-only">Search pages</DialogTitle>
        <Command className="rounded-lg" shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search pages..."
              className="flex-1 border-0 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {query && isLoading && (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            <Command.Empty className="flex flex-col items-center gap-2 text-sm text-muted-foreground text-center py-6">
              <FileSearch className="h-8 w-8 shrink-0 opacity-50" aria-hidden />
              {query ? "No results found." : "Type to search..."}
            </Command.Empty>

            {showRecent && (
              <Command.Group heading={
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground px-1 py-1">
                  <Clock className="h-3 w-3" />
                  Recent
                </span>
              }>
                {recentPages?.map((page) => (
                  <Command.Item
                    key={page.id}
                    value={page.id}
                    onSelect={() => handleSelect(page.id)}
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer data-[selected=true]:bg-accent"
                  >
                    <PageIcon icon={page.icon} type={page.type} />
                    <span className="truncate">{page.title || "Untitled"}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {query && results && results.length > 0 && (
              <Command.Group>
                {results.map((page) => (
                  <Command.Item
                    key={page.id}
                    value={page.id}
                    onSelect={() => handleSelect(page.id)}
                    className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm cursor-pointer data-[selected=true]:bg-accent"
                  >
                    <PageIcon icon={page.icon} type={page.type} />
                    <div className="min-w-0 flex-1">
                      <span className="truncate block">{page.title || "Untitled"}</span>
                      {page.snippet && (
                        <span className="truncate block text-xs text-muted-foreground">
                          <HighlightMatch text={page.snippet} query={query} />
                        </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

function PageIcon({ icon, type }: { icon: string | null; type: string }) {
  if (icon) return <span className="text-base shrink-0">{icon}</span>;
  if (type === "DATABASE")
    return <Database className="h-4 w-4 text-muted-foreground shrink-0" />;
  return <FileText className="h-4 w-4 text-muted-foreground shrink-0" />;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-900/50 text-foreground rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}
