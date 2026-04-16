"use client";

import { useState, useRef, useEffect } from "react";
import type { DatabaseView, ViewType } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { Button } from "@/components/ui/button";
import { Plus, Table, Kanban, X, Image, Calendar, List, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEW_OPTIONS: { type: ViewType; label: string; icon: React.ReactNode }[] = [
  { type: "table", label: "Table", icon: <Table className="h-4 w-4" /> },
  { type: "board", label: "Board", icon: <Kanban className="h-4 w-4" /> },
  { type: "timeline", label: "Timeline", icon: <CalendarRange className="h-4 w-4" /> },
  { type: "gallery", label: "Gallery", icon: <Image className="h-4 w-4" /> },
  { type: "calendar", label: "Calendar", icon: <Calendar className="h-4 w-4" /> },
  { type: "list", label: "List", icon: <List className="h-4 w-4" /> },
];

function viewIcon(type: ViewType) {
  switch (type) {
    case "table": return <Table className="h-3.5 w-3.5" />;
    case "board": return <Kanban className="h-3.5 w-3.5" />;
    case "timeline": return <CalendarRange className="h-3.5 w-3.5" />;
    case "gallery": return <Image className="h-3.5 w-3.5" />;
    case "calendar": return <Calendar className="h-3.5 w-3.5" />;
    case "list": return <List className="h-3.5 w-3.5" />;
    default: return <Table className="h-3.5 w-3.5" />;
  }
}

interface ViewTabsProps {
  views: DatabaseView[];
  activeViewId: string;
  onSelectView: (viewId: string) => void;
  onUpdateViews: (views: DatabaseView[]) => void;
  groupablePropertyIds?: string[];
}

export function ViewTabs({
  views,
  activeViewId,
  onSelectView,
  onUpdateViews,
  groupablePropertyIds,
}: ViewTabsProps) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const editInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingId) editInputRef.current?.focus();
  }, [editingId]);

  useEffect(() => {
    if (!adding) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setAdding(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [adding]);

  const addView = (type: ViewType) => {
    const label = VIEW_OPTIONS.find((v) => v.type === type)?.label ?? "View";
    const newView: DatabaseView = {
      id: generateId(),
      name: `${label} view`,
      type,
      filters: [],
      sorts: [],
      groupBy: type === "board" && groupablePropertyIds?.length ? groupablePropertyIds[0] : undefined,
      visibleProperties: [],
    };
    const updated = [...views, newView];
    onUpdateViews(updated);
    onSelectView(newView.id);
    setAdding(false);
  };

  const deleteView = (viewId: string) => {
    if (views.length <= 1) return;
    const updated = views.filter((v) => v.id !== viewId);
    onUpdateViews(updated);
    if (viewId === activeViewId) {
      onSelectView(updated[0].id);
    }
  };

  const startRename = (view: DatabaseView) => {
    setEditingId(view.id);
    setEditName(view.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      const updated = views.map((v) =>
        v.id === editingId ? { ...v, name: editName.trim() } : v
      );
      onUpdateViews(updated);
    }
    setEditingId(null);
    setEditName("");
  };

  return (
    <div className="flex items-center gap-1 border-b px-4">
      {views.map((view) => (
        <div
          key={view.id}
          className="relative group"
        >
          {editingId === view.id ? (
            <div className="flex items-center gap-1 px-2 py-2 border-b-2 border-foreground">
              {viewIcon(view.type)}
              <input
                ref={editInputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename();
                  if (e.key === "Escape") {
                    setEditingId(null);
                    setEditName("");
                  }
                }}
                className="text-sm bg-transparent outline-none border-b border-ring w-24"
              />
            </div>
          ) : (
            <button
              onClick={() => onSelectView(view.id)}
              onDoubleClick={() => startRename(view)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 transition-colors",
                activeViewId === view.id
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {viewIcon(view.type)}
              {view.name}
              {views.length > 1 && (
                <X
                  className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteView(view.id);
                  }}
                />
              )}
            </button>
          )}
        </div>
      ))}

      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setAdding(!adding)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        {adding && (
          <div className="absolute top-full left-0 z-50 mt-1 w-44 rounded-md border bg-popover p-1 shadow-md">
            {VIEW_OPTIONS.map(({ type, label, icon }) => (
              <button
                key={type}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm rounded hover:bg-accent"
                onClick={() => addView(type)}
              >
                {icon}
                {label} view
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
