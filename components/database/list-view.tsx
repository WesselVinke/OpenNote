"use client";

import type { Page } from "@prisma/client";
import type { PropertyDefinition, SelectOption, FilterRule, SortRule } from "@/lib/types";
import { CellRenderer } from "./cells/cell-renderer";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, List } from "lucide-react";
import { applyFiltersAndSorts } from "./filter-sort-utils";

interface ListViewProps {
  rows: Page[];
  properties: PropertyDefinition[];
  filters: FilterRule[];
  sorts: SortRule[];
  onCreateRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onRowClick: (row: Page) => void;
  onUpdateRowProperty: (rowId: string, propertyId: string, value: unknown) => void;
  onOptionsChange: (propertyId: string, options: SelectOption[]) => void;
  isCreating?: boolean;
  visibleProperties?: string[];
}

export function ListView({
  rows,
  properties,
  filters,
  sorts,
  onCreateRow,
  onDeleteRow,
  onRowClick,
  onUpdateRowProperty,
  onOptionsChange,
  isCreating,
  visibleProperties,
}: ListViewProps) {
  const filteredRows = applyFiltersAndSorts(rows, properties, filters, sorts);

  const displayProps = properties.filter((p) => {
    if (p.type === "title") return false;
    if (visibleProperties && visibleProperties.length > 0) {
      return visibleProperties.includes(p.id);
    }
    return true;
  }).slice(0, 4);

  return (
    <div className="px-4 py-2">
      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <List className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No items yet</p>
          <p className="text-xs mt-1">Click + to add your first entry</p>
        </div>
      ) : (
        <div className="divide-y">
          {filteredRows.map((row) => {
            const rawRp = row.rowProperties ?? {};
            const rowProps = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
            return (
              <div
                key={row.id}
                className="flex items-center gap-3 py-2 group hover:bg-muted/30 -mx-2 px-2 rounded transition-colors"
              >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete row</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this row? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteRow(row.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onRowClick(row)}
                >
                  <div className="flex items-center gap-1.5">
                    {row.icon && <span className="text-sm">{row.icon}</span>}
                    <span className="font-medium text-sm truncate hover:underline">
                      {row.title || "Untitled"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {displayProps.map((prop) => {
                    const val = prop.type === "created_time"
                      ? row.createdAt
                      : prop.type === "last_edited_time"
                      ? row.updatedAt
                      : rowProps[prop.id];
                    if (val === undefined || val === null || val === "") return null;
                    return (
                      <div
                        key={prop.id}
                        className="flex items-center gap-1 max-w-[140px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {prop.name}:
                        </span>
                        <div className="min-w-0 [&_input]:!text-xs [&_span]:!text-xs [&_div]:!text-xs [&_div]:!py-0 [&_div]:!px-1">
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
              </div>
            );
          })}
        </div>
      )}

      <Button
        variant="ghost"
        className="w-full justify-start gap-2 h-8 px-4 text-sm text-muted-foreground mt-1"
        onClick={onCreateRow}
        disabled={isCreating}
      >
        <Plus className="h-4 w-4" />
        {isCreating ? "Creating..." : "New"}
      </Button>
    </div>
  );
}
