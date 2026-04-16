"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUpdatePage, useDeletePage } from "@/lib/hooks/use-pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Undo2, Trash2, Search, AlertTriangle, X } from "lucide-react";
import type { Page } from "@prisma/client";
import { toast } from "sonner";

export default function TrashPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const { data: pages, isLoading } = useQuery({
    queryKey: ["trash", workspaceId],
    queryFn: async () => {
      const res = await fetch(
        `/api/pages/tree?workspaceId=${workspaceId}&deleted=true`
      );
      return res.json() as Promise<Page[]>;
    },
    enabled: !!workspaceId,
  });

  const filtered = pages?.filter(
    (p) =>
      !search || p.title.toLowerCase().includes(search.toLowerCase())
  );

  const handleRestore = (id: string) => {
    updatePage.mutate(
      { id, isDeleted: false } as { id: string } & Partial<Page>,
      {
        onSuccess: () => {
          toast.success("Page restored");
          queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] });
        },
      }
    );
  };

  const handlePermanentDelete = () => {
    if (!confirmId) return;
    deletePage.mutate(confirmId, {
      onSuccess: () => {
        toast.success("Page permanently deleted");
        queryClient.invalidateQueries({ queryKey: ["trash", workspaceId] });
        setConfirmId(null);
      },
    });
  };

  const confirmPage = pages?.find((p) => p.id === confirmId);

  return (
    <div className="max-w-2xl mx-auto py-6 md:py-12 px-4 md:px-8">
      <h1 className="text-2xl font-semibold mb-4">Trash</h1>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by page title..."
          className="pl-9"
        />
      </div>

      {isLoading && <p className="text-muted-foreground">Loading...</p>}

      {filtered && filtered.length === 0 && (
        <div className="text-center py-12">
          <Trash2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">
            {search ? "No matching pages in trash." : "Trash is empty."}
          </p>
        </div>
      )}

      <div className="space-y-1">
        {filtered?.map((page) => (
          <div
            key={page.id}
            className="flex items-center justify-between rounded-md border p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0">{page.icon || "📄"}</span>
              <span className="text-sm truncate">{page.title}</span>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => handleRestore(page.id)}
                title="Restore"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setConfirmId(page.id)}
                title="Delete permanently"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!confirmId} onOpenChange={(val) => !val && setConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-base">Delete permanently?</DialogTitle>
              <DialogDescription className="text-sm mt-1">
                &quot;{confirmPage?.title || "Untitled"}&quot; will be permanently deleted.
                This cannot be undone.
              </DialogDescription>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setConfirmId(null)} className="gap-2">
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handlePermanentDelete} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
