"use client";

import { useState, useRef, useEffect } from "react";
import type { SelectOption } from "@/lib/types";
import { SELECT_COLORS } from "@/lib/utils/constants";
import { generateId } from "@/lib/utils/id";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";

interface SelectCellProps {
  value: string | null;
  options: SelectOption[];
  onChange: (value: string | null) => void;
  onOptionsChange?: (options: SelectOption[]) => void;
}

export function SelectCell({
  value,
  options,
  onChange,
  onOptionsChange,
}: SelectCellProps) {
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
  const colorForOption = (color: string) => {
    const c = SELECT_COLORS.find((sc) => sc.name === color) ?? SELECT_COLORS[0];
    return `${c.bg} ${c.text}`;
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const colorIdx = options.length % SELECT_COLORS.length;
    const opt: SelectOption = {
      id: generateId(),
      name: newName.trim(),
      color: SELECT_COLORS[colorIdx].name,
    };
    onOptionsChange?.([...options, opt]);
    onChange(opt.id);
    setNewName("");
    setOpen(false);
  };

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      <div
        className="h-full w-full px-2 py-1 text-sm cursor-pointer flex items-center"
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
              colorForOption(selected.color)
            )}
          >
            {selected.name}
          </span>
        ) : value ? (
          <span className="text-xs text-muted-foreground">{String(value)}</span>
        ) : (
          <span className="text-muted-foreground">&nbsp;</span>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-md border bg-popover p-1 shadow-md">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search or create..."
            className="w-full px-2 py-1 text-sm bg-transparent outline-none border-b border-border mb-1"
          />
          <div className="max-h-40 overflow-y-auto">
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
            {options
              .filter(
                (o) =>
                  !newName || o.name.toLowerCase().includes(newName.toLowerCase())
              )
              .map((opt) => (
                <button
                  key={opt.id}
                  className="flex w-full items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent"
                  onClick={() => {
                    onChange(opt.id);
                    setNewName("");
                  }}
                >
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      colorForOption(opt.color)
                    )}
                  >
                    {opt.name}
                  </span>
                  {opt.id === value && (
                    <Check className="h-3 w-3 ml-auto" />
                  )}
                </button>
              ))}
          </div>
          {newName &&
            !options.some(
              (o) => o.name.toLowerCase() === newName.toLowerCase()
            ) && (
              <button
                className="flex w-full items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent text-muted-foreground"
                onClick={handleCreate}
              >
                Create <span className="font-medium text-foreground">{newName}</span>
              </button>
            )}
        </div>
      )}
    </div>
  );
}
