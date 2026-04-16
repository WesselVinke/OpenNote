"use client";

import type { PropertyDefinition, SortRule } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, X, Plus } from "lucide-react";
import { useState } from "react";

interface SortBarProps {
  properties: PropertyDefinition[];
  sorts: SortRule[];
  onChange: (sorts: SortRule[]) => void;
}

export function SortBar({ properties, sorts, onChange }: SortBarProps) {
  const [open, setOpen] = useState(false);

  const addSort = () => {
    const firstProp = properties[0];
    if (!firstProp) return;
    onChange([
      ...sorts,
      { id: generateId(), propertyId: firstProp.id, direction: "ascending" },
    ]);
    setOpen(true);
  };

  const updateSort = (id: string, patch: Partial<SortRule>) => {
    onChange(sorts.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const removeSort = (id: string) => {
    const updated = sorts.filter((s) => s.id !== id);
    onChange(updated);
    if (updated.length === 0) setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={sorts.length > 0 ? "secondary" : "ghost"}
        size="sm"
        className="gap-1.5 h-7 text-xs"
        onClick={() => {
          if (sorts.length === 0) addSort();
          else if (open) {
            onChange([]);
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
      >
        <ArrowUpDown className="h-3 w-3" />
        Sort
        {sorts.length > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px]">
            {sorts.length}
          </span>
        )}
      </Button>

      {open && sorts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {sorts.map((sort, idx) => (
            <div
              key={sort.id}
              className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs"
            >
              {idx > 0 && <span className="text-muted-foreground mr-1">then</span>}
              <select
                value={sort.propertyId}
                onChange={(e) =>
                  updateSort(sort.id, { propertyId: e.target.value })
                }
                className="bg-transparent outline-none text-xs max-w-[80px]"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <select
                value={sort.direction}
                onChange={(e) =>
                  updateSort(sort.id, {
                    direction: e.target.value as "ascending" | "descending",
                  })
                }
                className="bg-transparent outline-none text-xs text-muted-foreground"
              >
                <option value="ascending">Ascending</option>
                <option value="descending">Descending</option>
              </select>

              <button
                onClick={() => removeSort(sort.id)}
                className="text-muted-foreground hover:text-foreground ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={addSort}
            className="text-muted-foreground"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}
