"use client";

import type { Page } from "@prisma/client";
import type { PropertyDefinition, SelectOption, FilterRule, SortRule } from "@/lib/types";
import { CellRenderer } from "./cells/cell-renderer";
import { Button } from "@/components/ui/button";
import { Plus, Image } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyFiltersAndSorts } from "./filter-sort-utils";

interface GalleryViewProps {
  rows: Page[];
  properties: PropertyDefinition[];
  filters: FilterRule[];
  sorts: SortRule[];
  onCreateRow: () => void;
  onRowClick: (row: Page) => void;
  onUpdateRowProperty: (rowId: string, propertyId: string, value: unknown) => void;
  onOptionsChange: (propertyId: string, options: SelectOption[]) => void;
  isCreating?: boolean;
  cardSize?: "small" | "medium" | "large";
  visibleProperties?: string[];
}

const CARD_SIZES = {
  small: "w-48",
  medium: "w-64",
  large: "w-80",
};

export function GalleryView({
  rows,
  properties,
  filters,
  sorts,
  onCreateRow,
  onRowClick,
  onUpdateRowProperty,
  onOptionsChange,
  isCreating,
  cardSize = "medium",
  visibleProperties,
}: GalleryViewProps) {
  const filteredRows = applyFiltersAndSorts(rows, properties, filters, sorts);

  const displayProps = properties.filter((p) => {
    if (p.type === "title") return false;
    if (visibleProperties && visibleProperties.length > 0) {
      return visibleProperties.includes(p.id);
    }
    return true;
  }).slice(0, 3);

  return (
    <div className="p-4">
      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Image className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No items yet</p>
          <p className="text-xs mt-1">Click + to add your first entry</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {filteredRows.map((row) => {
            const rawRp = row.rowProperties ?? {};
            const rowProps = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
            return (
              <div
                key={row.id}
                className={cn(
                  "rounded-lg border bg-background shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden flex flex-col",
                  CARD_SIZES[cardSize]
                )}
                onClick={() => onRowClick(row)}
              >
                {row.coverImage ? (
                  <div className="h-32 bg-muted overflow-hidden">
                    <img
                      src={row.coverImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-24 bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                    {row.icon ? (
                      <span className="text-3xl">{row.icon}</span>
                    ) : (
                      <Image className="h-8 w-8 text-muted-foreground/40" />
                    )}
                  </div>
                )}

                <div className="p-3 flex-1 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    {row.icon && !row.coverImage && (
                      <span className="text-sm">{row.icon}</span>
                    )}
                    <span className="font-medium text-sm truncate">
                      {row.title || "Untitled"}
                    </span>
                  </div>

                  {displayProps.length > 0 && (
                    <div className="space-y-1">
                      {displayProps.map((prop) => {
                        const val = prop.type === "created_time"
                          ? row.createdAt
                          : prop.type === "last_edited_time"
                          ? row.updatedAt
                          : rowProps[prop.id];
                        if (val === undefined || val === null || val === "") return null;
                        return (
                          <div key={prop.id} className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground shrink-0 w-16 truncate">
                              {prop.name}
                            </span>
                            <div className="flex-1 min-w-0 [&_input]:!text-xs [&_span]:!text-xs [&_div]:!text-xs [&_div]:!py-0 [&_div]:!px-0">
                              <CellRenderer
                                property={prop}
                                value={val}
                                onChange={(v) => onUpdateRowProperty(row.id, prop.id, v)}
                                onOptionsChange={(opts) => onOptionsChange(prop.id, opts)}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        variant="ghost"
        className="w-full justify-start gap-2 h-8 px-4 text-sm text-muted-foreground mt-3"
        onClick={onCreateRow}
        disabled={isCreating}
      >
        <Plus className="h-4 w-4" />
        {isCreating ? "Creating..." : "New"}
      </Button>
    </div>
  );
}
