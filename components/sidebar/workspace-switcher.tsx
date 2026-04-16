"use client";

import { useState, useRef, useEffect } from "react";
import { useWorkspaces, useCreateWorkspace } from "@/lib/hooks/use-workspaces";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronsUpDown, Plus, Check } from "lucide-react";

interface WorkspaceItem {
  id: string;
  name: string;
  icon: string | null;
}

export function WorkspaceSwitcher() {
  const { data: workspaces } = useWorkspaces();
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspaceStore();
  const createWorkspace = useCreateWorkspace();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const ws = workspaces as WorkspaceItem[] | undefined;
  const active = ws?.find((w) => w.id === activeWorkspaceId);

  useEffect(() => {
    if (dialogOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [dialogOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newWs = await createWorkspace.mutateAsync(newName.trim());
    setActiveWorkspaceId(newWs.id);
    setDialogOpen(false);
    setNewName("");
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 gap-1 px-2 flex-1 justify-between mr-2 overflow-hidden">
            <div className="flex items-center gap-2 truncate">
              <span className="text-base">{active?.icon || "🏠"}</span>
              <span className="truncate text-base font-medium text-neutral-700 dark:text-neutral-400 select-none">{active?.name || "Workspace"}</span>
            </div>
            <ChevronsUpDown className="h-5 w-5 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          {ws?.map((w) => (
            <DropdownMenuItem
              key={w.id}
              onClick={() => {
                setActiveWorkspaceId(w.id);
                setOpen(false);
              }}
              className="gap-2"
            >
              <span className="text-base">{w.icon || "🏠"}</span>
              <span className="truncate flex-1 text-base font-medium text-neutral-700 dark:text-neutral-400 select-none">{w.name}</span>
              {w.id === activeWorkspaceId && <Check className="h-5 w-5" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setOpen(false);
              setDialogOpen(true);
            }}
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            <span className="text-base font-medium text-neutral-700 dark:text-neutral-400 select-none">Create workspace</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>Give your new workspace a name to get started.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-2 py-2">
              <Label htmlFor="workspace-name">Name</Label>
              <Input
                ref={inputRef}
                id="workspace-name"
                placeholder="My workspace"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!newName.trim() || createWorkspace.isPending}>
                {createWorkspace.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
