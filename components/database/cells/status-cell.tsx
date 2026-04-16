"use client";

import { useState, useRef, useEffect } from "react";
import type { SelectOption } from "@/lib/types";
import { STATUS_CATEGORIES, type StatusGroup } from "@/lib/utils/constants";
import { generateId } from "@/lib/utils/id";
import { cn } from "@/lib/utils";
import { Check, X, Circle, Loader2, CheckCircle2 } from "lucide-react";

export interface StatusOption extends SelectOption {
  group: StatusGroup;
}

interface StatusCellProps {
  value: string | null;
  options: StatusOption[];
  onChange: (value: string | null) => void;
  onOptionsChange?: (options: StatusOption[]) => void;
}

function statusIcon(group: StatusGroup, className?: string) {
  switch (group) {
    case "todo":
      return <Circle className={cn("h-3.5 w-3.5 text-gray-400", className)} />;
    case "in_progress":
      return <Loader2 className={cn("h-3.5 w-3.5 text-blue-500", className)} />;
    case "complete":
      return <CheckCircle2 className={cn("h-3.5 w-3.5 text-green-500", className)} />;
  }
}

export function StatusCell({
  value,
  options,
  onChange,
  onOptionsChange,
}: StatusCellProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const selected = options.find((o) => o.id === value)
    ?? (value ? options.find((o) => o.name.toLowerCase() === String(value).toLowerCase()) : undefined);

  const handleCreate = (group: StatusGroup) => {
    if (!newName.trim()) return;
    const opt: StatusOption = {
      id: generateId(),
      name: newName.trim(),
      color: STATUS_CATEGORIES.find((c) => c.group === group)?.name === "Done" ? "Green" : group === "in_progress" ? "Blue" : "Default",
      group,
    };
    onOptionsChange?.([...options, opt]);
    onChange(opt.id);
    setNewName("");
    setOpen(false);
  };

  const groupedOptions = STATUS_CATEGORIES.map((cat) => ({
    ...cat,
    options: options.filter((o) => o.group === cat.group),
  }));

  const filteredGrouped = groupedOptions.map((g) => ({
    ...g,
    options: g.options.filter(
      (o) => !newName || o.name.toLowerCase().includes(newName.toLowerCase())
    ),
  }));

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      <div
        className="h-full w-full px-2 py-1 text-sm cursor-pointer flex items-center"
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium">
            {statusIcon(selected.group)}
            {selected.name}
          </span>
        ) : value ? (
          <span className="text-xs text-muted-foreground">{String(value)}</span>
        ) : (
          <span className="text-muted-foreground">&nbsp;</span>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search..."
            className="w-full px-2 py-1 text-sm bg-transparent outline-none border-b border-border mb-1"
          />

          <div className="max-h-60 overflow-y-auto">
            {value && (
              <button
                className="flex w-full items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent"
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}

            {filteredGrouped.map((category) => (
              <div key={category.group}>
                {category.options.length > 0 && (
                  <>
                    <div className="px-2 pt-2 pb-1 text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                      {category.name}
                    </div>
                    {category.options.map((opt) => (
                      <button
                        key={opt.id}
                        className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent"
                        onClick={() => {
                          onChange(opt.id);
                          setNewName("");
                          setOpen(false);
                        }}
                      >
                        {statusIcon(opt.group)}
                        <span>{opt.name}</span>
                        {opt.id === value && (
                          <Check className="h-3 w-3 ml-auto text-primary" />
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            ))}

            {newName &&
              !options.some(
                (o) => o.name.toLowerCase() === newName.toLowerCase()
              ) && (
                <div className="border-t mt-1 pt-1">
                  <p className="px-2 py-1 text-[10px] text-muted-foreground uppercase">
                    Create in...
                  </p>
                  {STATUS_CATEGORIES.map((cat) => (
                    <button
                      key={cat.group}
                      className="flex w-full items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent text-muted-foreground"
                      onClick={() => handleCreate(cat.group)}
                    >
                      {statusIcon(cat.group)}
                      <span className="font-medium text-foreground">{newName}</span>
                      <span className="text-[10px] ml-auto">{cat.name}</span>
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
