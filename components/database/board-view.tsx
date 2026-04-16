"use client";

import { useState } from "react";
import type { Page } from "@prisma/client";
import type { PropertyDefinition, SelectOption, FilterRule, SortRule } from "@/lib/types";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDroppable } from "@dnd-kit/core";
import { CellRenderer } from "./cells/cell-renderer";
import { Button } from "@/components/ui/button";
import { Plus, Columns } from "lucide-react";
import { cn } from "@/lib/utils";
import { SELECT_COLORS } from "@/lib/utils/constants";
import { applyFiltersAndSorts } from "./filter-sort-utils";
import { toast } from "sonner";

interface BoardViewProps {
  rows: Page[];
  properties: PropertyDefinition[];
  groupByPropertyId: string | undefined;
  filters: FilterRule[];
  sorts: SortRule[];
  onUpdateRowProperty: (rowId: string, propertyId: string, value: unknown) => void;
  onCreateRow: (properties?: Record<string, unknown>) => void;
  onRowClick: (row: Page) => void;
  onOptionsChange: (propertyId: string, options: SelectOption[]) => void;
  isCreating?: boolean;
  hideEmptyGroups?: boolean;
  cardProperties?: string[];
}

export function BoardView({
  rows,
  properties,
  groupByPropertyId,
  filters,
  sorts,
  onUpdateRowProperty,
  onCreateRow,
  onRowClick,
  onOptionsChange,
  isCreating,
  hideEmptyGroups,
  cardProperties,
}: BoardViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const groupProp = properties.find((p) => p.id === groupByPropertyId);
  const selectOptions: SelectOption[] = groupProp?.options ?? [];
  const filteredRows = applyFiltersAndSorts(rows, properties, filters, sorts);

  const columns: { id: string; name: string; color: string }[] = [
    ...selectOptions.map((o) => ({ id: o.id, name: o.name, color: o.color })),
    { id: "__no_value__", name: "No status", color: "Default" },
  ];

  const getColumnRows = (columnId: string) => {
    return filteredRows.filter((row) => {
      const rawRp = row.rowProperties ?? {};
      const rowProps = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
      const val = groupByPropertyId ? rowProps[groupByPropertyId] : null;
      if (columnId === "__no_value__") return !val;
      return val === columnId;
    });
  };

  // Determine which properties to show on cards
  const displayProps = properties.filter((p) => {
    if (p.type === "title") return false;
    if (p.id === groupByPropertyId) return false; // don't show the grouping property
    if (cardProperties && cardProperties.length > 0) {
      return cardProperties.includes(p.id);
    }
    return true;
  }).slice(0, 3);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || !groupByPropertyId) return;

    const rowId = active.id as string;
    let targetColumnId = over.id as string;

    if (rows.some((r) => r.id === targetColumnId)) {
      const targetRow = rows.find((r) => r.id === targetColumnId);
      if (targetRow) {
        const targetProps = (targetRow.rowProperties ?? {}) as Record<string, unknown>;
        targetColumnId = (targetProps[groupByPropertyId] as string) ?? "__no_value__";
      }
    }

    const newValue = targetColumnId === "__no_value__" ? null : targetColumnId;
    onUpdateRowProperty(rowId, groupByPropertyId, newValue);
    toast.success("Card moved");
  };

  const activeRow = activeId ? rows.find((r) => r.id === activeId) : null;

  if (!groupProp) {
    const hasGroupable = properties.some(
      (p) => p.type === "select" || p.type === "status" || p.type === "multi_select"
    );
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Columns className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No grouping property selected</p>
        <p className="text-xs mt-1">
          {hasGroupable
            ? 'Use the "Group by" dropdown above to choose a property for columns.'
            : 'Add a "Status" or "Select" property first, then use "Group by" above.'}
        </p>
      </div>
    );
  }

  const visibleColumns = hideEmptyGroups
    ? columns.filter((col) => getColumnRows(col.id).length > 0)
    : columns;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 p-4 overflow-x-auto min-h-[400px]">
        {visibleColumns.map((col) => {
          const colRows = getColumnRows(col.id);
          return (
            <BoardColumn
              key={col.id}
              column={col}
              rows={colRows}
              displayProperties={displayProps}
              onRowClick={onRowClick}
              onUpdateRowProperty={onUpdateRowProperty}
              onOptionsChange={onOptionsChange}
              isCreating={isCreating}
              onCreateRow={() => {
                if (col.id === "__no_value__") {
                  onCreateRow();
                } else {
                  onCreateRow(
                    groupByPropertyId ? { [groupByPropertyId]: col.id } : {}
                  );
                }
              }}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeRow && (
          <BoardCard
            row={activeRow}
            displayProperties={displayProps}
            onUpdateRowProperty={() => {}}
            onOptionsChange={() => {}}
            onClick={() => {}}
            isDragging
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}

function BoardColumn({
  column,
  rows,
  displayProperties,
  onRowClick,
  onUpdateRowProperty,
  onOptionsChange,
  onCreateRow,
  isCreating,
}: {
  column: { id: string; name: string; color: string };
  rows: Page[];
  displayProperties: PropertyDefinition[];
  onRowClick: (row: Page) => void;
  onUpdateRowProperty: (rowId: string, propertyId: string, value: unknown) => void;
  onOptionsChange: (propertyId: string, options: SelectOption[]) => void;
  onCreateRow: () => void;
  isCreating?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const colorDef = SELECT_COLORS.find((c) => c.name === column.color) ?? SELECT_COLORS[0];

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-72 min-w-[288px] rounded-lg bg-muted/50 shrink-0",
        isOver && "ring-2 ring-ring"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
            colorDef.bg,
            colorDef.text
          )}
        >
          {column.name}
        </span>
        <span className="text-muted-foreground text-xs">{rows.length}</span>
      </div>

      <SortableContext
        items={rows.map((r) => r.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 px-2 pb-2 space-y-1.5 min-h-[50px]">
          {rows.map((row) => (
            <SortableBoardCard
              key={row.id}
              row={row}
              displayProperties={displayProperties}
              onUpdateRowProperty={onUpdateRowProperty}
              onOptionsChange={onOptionsChange}
              onClick={() => onRowClick(row)}
            />
          ))}
        </div>
      </SortableContext>

      <div className="px-2 pb-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-1 text-muted-foreground h-7"
          onClick={onCreateRow}
          disabled={isCreating}
        >
          <Plus className="h-3.5 w-3.5" />
          {isCreating ? "Creating..." : "New"}
        </Button>
      </div>
    </div>
  );
}

function SortableBoardCard({
  row,
  displayProperties,
  onUpdateRowProperty,
  onOptionsChange,
  onClick,
}: {
  row: Page;
  displayProperties: PropertyDefinition[];
  onUpdateRowProperty: (rowId: string, propertyId: string, value: unknown) => void;
  onOptionsChange: (propertyId: string, options: SelectOption[]) => void;
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <BoardCard
        row={row}
        displayProperties={displayProperties}
        onUpdateRowProperty={onUpdateRowProperty}
        onOptionsChange={onOptionsChange}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}

function BoardCard({
  row,
  displayProperties,
  onUpdateRowProperty,
  onOptionsChange,
  onClick,
  isDragging,
}: {
  row: Page;
  displayProperties: PropertyDefinition[];
  onUpdateRowProperty: (rowId: string, propertyId: string, value: unknown) => void;
  onOptionsChange: (propertyId: string, options: SelectOption[]) => void;
  onClick: () => void;
  isDragging?: boolean;
}) {
  const rawRp = row.rowProperties ?? {};
  const rowProps = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;

  return (
    <div
      className={cn(
        "rounded-md border bg-background p-2.5 text-sm cursor-pointer shadow-sm hover:shadow transition-shadow",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={onClick}
    >
      {row.coverImage && (
        <div className="h-20 -mx-2.5 -mt-2.5 mb-2 rounded-t overflow-hidden">
          <img src={row.coverImage} alt="" className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-1">
        {row.icon && <span className="text-sm shrink-0">{row.icon}</span>}
        <span className="font-medium truncate">{row.title || "Untitled"}</span>
      </div>

      {displayProperties.length > 0 && (
        <div className="space-y-1 mt-1.5">
          {displayProperties.map((prop) => {
            const val = prop.type === "created_time"
              ? row.createdAt
              : prop.type === "last_edited_time"
              ? row.updatedAt
              : rowProps[prop.id];
            if (val === undefined || val === null || val === "") return null;
            return (
              <div
                key={prop.id}
                className="flex items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="text-[10px] text-muted-foreground shrink-0 w-14 truncate">
                  {prop.name}
                </span>
                <div className="flex-1 min-w-0 [&_input]:!text-xs [&_span]:!text-xs [&_div]:!text-xs [&_div]:!py-0 [&_div]:!px-1">
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
  );
}
