"use client";

import { useState, useRef, useEffect } from "react";
import type { SelectOption } from "@/lib/types";
import { SELECT_COLORS } from "@/lib/utils/constants";
import { generateId } from "@/lib/utils/id";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface MultiSelectCellProps {
  value: string[];
  options: SelectOption[];
  onChange: (value: string[]) => void;
  onOptionsChange?: (options: SelectOption[]) => void;
}

export function MultiSelectCell({
  value,
  options,
  onChange,
  onOptionsChange,
}: MultiSelectCellProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const vals = Array.isArray(value) ? value : [];

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

  const colorForOption = (color: string) => {
    const c = SELECT_COLORS.find((sc) => sc.name === color) ?? SELECT_COLORS[0];
    return `${c.bg} ${c.text}`;
  };

  const toggleOption = (id: string) => {
    onChange(vals.includes(id) ? vals.filter((v) => v !== id) : [...vals, id]);
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
    onChange([...vals, opt.id]);
    setNewName("");
  };

  const selectedOpts = options.filter((o) => vals.includes(o.id));

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      <div
        className="h-full w-full px-2 py-1 text-sm cursor-pointer flex items-center gap-1 flex-wrap overflow-hidden"
        onClick={() => setOpen(!open)}
      >
        {selectedOpts.length > 0 ? (
          selectedOpts.map((opt) => (
            <span
              key={opt.id}
              className={cn(
                "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                colorForOption(opt.color)
              )}
            >
              {opt.name}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">&nbsp;</span>
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-52 rounded-md border bg-popover p-1 shadow-md">
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
            {options
              .filter(
                (o) =>
                  !newName || o.name.toLowerCase().includes(newName.toLowerCase())
              )
              .map((opt) => (
                <button
                  key={opt.id}
                  className="flex w-full items-center gap-2 px-2 py-1 text-sm rounded hover:bg-accent"
                  onClick={() => toggleOption(opt.id)}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded border flex items-center justify-center",
                      vals.includes(opt.id)
                        ? "bg-primary border-primary"
                        : "border-border"
                    )}
                  >
                    {vals.includes(opt.id) && (
                      <Check className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium",
                      colorForOption(opt.color)
                    )}
                  >
                    {opt.name}
                  </span>
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
