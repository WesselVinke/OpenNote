"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useWorkspaceStore } from "@/lib/store/workspace-store";
import { useCreatePage, useUpdatePage } from "@/lib/hooks/use-pages";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  MoreHorizontal,
  Star,
  StarOff,
  Trash2,
  FileText,
  Database,
  GripVertical,
  Plus,
  FilePlus,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  title: string;
  icon: string | null;
  type: string;
  parentId: string | null;
  isFavorite: boolean;
  sortOrder: number;
}

interface PageTreeItemProps {
  page: TreeNode;
  childrenMap: Map<string, TreeNode[]>;
  level: number;
  isNested?: boolean;
}

export function PageTreeItem({ page, childrenMap, level, isNested }: PageTreeItemProps) {
  const router = useRouter();
  const params = useParams();
  const updatePage = useUpdatePage();
  const createPage = useCreatePage();

  const children = childrenMap.get(page.id) || [];
  const hasChildren = children.length > 0;
  const isActive = params.pageId === page.id;

  // Check if the active page is a descendant of this node
  const hasActiveDescendant = (nodeId: string): boolean => {
    const kids = childrenMap.get(nodeId) || [];
    return kids.some((k) => k.id === params.pageId || hasActiveDescendant(k.id));
  };
  const shouldAutoExpand = hasChildren && hasActiveDescendant(page.id);

  const [expanded, setExpanded] = useState(hasChildren);

  // Auto-expand when navigating to a descendant page
  useEffect(() => {
    if (shouldAutoExpand && !expanded) {
      setExpanded(true);
    }
  }, [shouldAutoExpand]); // eslint-disable-line react-hooks/exhaustive-deps

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const { setNodeRef: setNestRef, isOver: isNestOver } = useDroppable({
    id: `nest-${page.id}`,
    data: { type: "nest", pageId: page.id },
  });

  // When using DragOverlay, don't apply transform to the original - it stays in place
  // to prevent scroll/layout issues. The overlay shows the dragged item.
  const style = isDragging
    ? { transition }
    : { transform: CSS.Transform.toString(transform), transition };

  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const handleClick = () => {
    router.push(`/${workspaceId}/${page.id}`);
  };

  const handleToggleFavorite = () => {
    updatePage.mutate({ id: page.id, isFavorite: !page.isFavorite });
  };

  const handleMoveToTrash = () => {
    updatePage.mutate({ id: page.id, isDeleted: true } as Parameters<typeof updatePage.mutate>[0]);
  };

  const handleAddSubpage = async () => {
    if (!workspaceId) return;
    const newPage = await createPage.mutateAsync({
      workspaceId,
      parentId: page.id,
    });
    setExpanded(true);
    router.push(`/${workspaceId}/${newPage.id}`);
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(!isNested && "mb-1.5 last:mb-0")}>
      <div
        ref={setNestRef}
        className={cn(
          "group flex items-center gap-0.5 rounded-md pr-1 text-sm hover:bg-sidebar-accent transition-colors cursor-pointer",
          isActive && "bg-sidebar-accent border-l-2 border-primary",
          !isActive && "border-l-2 border-transparent",
          isDragging && "opacity-0",
          isNestOver && !isDragging && "ring-2 ring-blue-400/60 bg-blue-500/10"
        )}
        style={{ paddingLeft: `${level * 12 + 4}px` }}
      >
        <button
          className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-grab shrink-0"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
          className={cn(
            "p-0.5 shrink-0 transition-transform",
            !hasChildren && "invisible"
          )}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              expanded && "rotate-90"
            )}
          />
        </button>

        <div
          className="flex flex-1 items-center gap-1.5 py-1.5 min-w-0"
          onClick={handleClick}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-base leading-none">
            {page.icon ? (
              page.icon
            ) : page.type === "DATABASE" ? (
              <Database className="h-[18px] w-[18px] text-muted-foreground/70" />
            ) : (
              <FileText className="h-[18px] w-[18px] text-muted-foreground/70" />
            )}
          </span>
          <span className="truncate text-base font-medium text-neutral-700 dark:text-neutral-400 select-none">{page.title || "Untitled"}</span>
        </div>

        <div className="flex shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-5 w-5 rounded-sm hover:bg-sidebar-accent-foreground/15"
            onClick={(e) => {
              e.stopPropagation();
              handleAddSubpage();
            }}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="h-5 w-5 rounded-sm hover:bg-sidebar-accent-foreground/15" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right">
              <DropdownMenuItem onClick={handleAddSubpage} className="gap-2">
                <FilePlus className="h-4 w-4" />
                Add subpage
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleToggleFavorite} className="gap-2">
                {page.isFavorite ? (
                  <>
                    <StarOff className="h-4 w-4" />
                    Remove from favorites
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4" />
                    Add to favorites
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleMoveToTrash} className="gap-2 text-destructive">
                <Trash2 className="h-4 w-4" />
                Move to trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 mt-1.5 ml-3 border-l border-sidebar-border/40">
          {children.map((child) => (
            <PageTreeItem
              key={child.id}
              page={child}
              childrenMap={childrenMap}
              level={level + 1}
              isNested
            />
          ))}
        </div>
      )}
    </div>
  );
}
