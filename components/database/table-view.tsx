"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import type { Page } from "@prisma/client";
import type { PropertyDefinition, SelectOption, FilterRule, SortRule, CalculationType } from "@/lib/types";
import { CellRenderer } from "./cells/cell-renderer";
import { AddProperty } from "./add-property";
import { PropertyIcon } from "./property-icon";
import { calculate, CALCULATION_OPTIONS } from "./calculations";
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
import { Plus, Trash2, Table, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyFiltersAndSorts } from "./filter-sort-utils";

interface TableViewProps {
  rows: Page[];
  properties: PropertyDefinition[];
  filters: FilterRule[];
  sorts: SortRule[];
  visibleProperties?: string[];
  calculations?: Record<string, CalculationType>;
  groupBy?: string;
  onCreateRow: () => void;
  onDeleteRow: (rowId: string) => void;
  onDuplicateRow?: (row: Page) => void;
  onUpdateRowTitle: (rowId: string, title: string) => void;
  onUpdateRowProperty: (rowId: string, propertyId: string, value: unknown) => void;
  onAddProperty: (property: PropertyDefinition) => void;
  onDeleteProperty: (propertyId: string) => void;
  onRenameProperty?: (propertyId: string, name: string) => void;
  onResizeProperty: (propertyId: string, width: number) => void;
  onOptionsChange: (propertyId: string, options: SelectOption[]) => void;
  onRowClick: (row: Page) => void;
  onCalculationChange?: (propertyId: string, calculation: CalculationType) => void;
  isCreating?: boolean;
}

export function TableView({
  rows,
  properties,
  filters,
  sorts,
  visibleProperties,
  calculations,
  groupBy,
  onCreateRow,
  onDeleteRow,
  onDuplicateRow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdateRowTitle,
  onUpdateRowProperty,
  onAddProperty,
  onDeleteProperty,
  onRenameProperty,
  onResizeProperty,
  onOptionsChange,
  onRowClick,
  onCalculationChange,
  isCreating,
}: TableViewProps) {
  const filteredRows = applyFiltersAndSorts(rows, properties, filters, sorts);

  // Filter visible properties
  const displayProperties = useMemo(() => {
    const nonTitle = properties.filter((p) => p.type !== "title");
    if (!visibleProperties || visibleProperties.length === 0) return nonTitle;
    return nonTitle.filter((p) => visibleProperties.includes(p.id));
  }, [properties, visibleProperties]);

  // Grouping
  const groupProp = groupBy ? properties.find((p) => p.id === groupBy) : null;
  const groups = useMemo(() => {
    if (!groupProp) return null;
    const map = new Map<string, Page[]>();
    for (const row of filteredRows) {
      const rawGroupRp = row.rowProperties ?? {};
      const rp = (typeof rawGroupRp === "string" ? JSON.parse(rawGroupRp) : rawGroupRp) as Record<string, unknown>;
      const val = rp[groupProp.id];
      const key = val == null || val === "" ? "__empty__" : String(val);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    // Sort groups by option order for select types
    if (groupProp.type === "select" || groupProp.type === "status" || groupProp.type === "multi_select") {
      const optionOrder = (groupProp.options ?? []).map((o) => o.id);
      const sorted = new Map<string, Page[]>();
      for (const optId of optionOrder) {
        if (map.has(optId)) {
          sorted.set(optId, map.get(optId)!);
          map.delete(optId);
        }
      }
      if (map.has("__empty__")) {
        sorted.set("__empty__", map.get("__empty__")!);
        map.delete("__empty__");
      }
      for (const [k, v] of map) sorted.set(k, v);
      return sorted;
    }
    return map;
  }, [filteredRows, groupProp]);

  const getGroupLabel = (key: string) => {
    if (key === "__empty__") return "No value";
    if (groupProp?.options) {
      const opt = groupProp.options.find((o) => o.id === key);
      return opt?.name ?? key;
    }
    return key;
  };

  const hasCalc = calculations && Object.values(calculations).some((c) => c !== "none");

  const renderTableBlock = (blockRows: Page[], showCalcRow: boolean) => (
    <>
      <tbody>
        {blockRows.map((row) => {
          const rawRp = row.rowProperties ?? {};
          const rowProps = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
          return (
            <tr
              key={row.id}
              className="border-b hover:bg-muted/30 group transition-colors"
            >
              <td className="w-8 px-2 py-0 sticky left-0 bg-background z-10">
                <div className="flex items-center gap-0.5">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground h-6 w-6"
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
                </div>
              </td>
              <td
                className="border-r cursor-pointer sticky left-8 bg-background z-10"
                style={{ width: 250, minWidth: 250, maxWidth: 250 }}
                onClick={() => onRowClick(row)}
              >
                <div className="px-2 py-1 text-sm font-medium truncate hover:underline flex items-center gap-1">
                  {row.icon && <span className="shrink-0">{row.icon}</span>}
                  <span className="truncate">{row.title || "Untitled"}</span>
                </div>
              </td>
              {displayProperties.map((prop) => {
                const val = prop.type === "created_time"
                  ? row.createdAt
                  : prop.type === "last_edited_time"
                  ? row.updatedAt
                  : rowProps[prop.id];
                return (
                  <td
                    key={prop.id}
                    className="border-r"
                    style={{
                      width: prop.width ?? 150,
                      minWidth: prop.width ?? 150,
                      maxWidth: prop.width ?? 150,
                    }}
                  >
                    <CellRenderer
                      property={prop}
                      value={val}
                      onChange={(v) => onUpdateRowProperty(row.id, prop.id, v)}
                      onOptionsChange={(opts) => onOptionsChange(prop.id, opts)}
                    />
                  </td>
                );
              })}
              <td className="w-10">
                {onDuplicateRow && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground h-6 w-6"
                    onClick={() => onDuplicateRow(row)}
                    title="Duplicate row"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
      {showCalcRow && (
        <tfoot>
          <tr className="border-t bg-muted/30 relative z-[30]">
            <td className="w-8 sticky left-0 bg-muted/30" />
            <td className="sticky left-8 bg-muted/30 border-r" style={{ width: 250, minWidth: 250, maxWidth: 250 }}>
              <CalculationPicker
                value={calculations?.["title"] ?? "none"}
                onChange={(c) => onCalculationChange?.("title", c)}
                displayValue={calculate(blockRows, { id: "title", name: "Title", type: "title" }, calculations?.["title"] ?? "none")}
                isNumeric={false}
              />
            </td>
            {displayProperties.map((prop) => (
              <td
                key={prop.id}
                className="border-r"
                style={{ width: prop.width ?? 150, minWidth: prop.width ?? 150, maxWidth: prop.width ?? 150 }}
              >
                <CalculationPicker
                  value={calculations?.[prop.id] ?? "none"}
                  onChange={(c) => onCalculationChange?.(prop.id, c)}
                  displayValue={calculate(blockRows, prop, calculations?.[prop.id] ?? "none")}
                  isNumeric={prop.type === "number"}
                />
              </td>
            ))}
            <td className="w-10" />
          </tr>
        </tfoot>
      )}
    </>
  );

  if (groups) {
    return (
      <div>
        {Array.from(groups.entries()).map(([key, groupRows]) => (
          <div key={key} className="mb-4">
            <GroupHeader label={getGroupLabel(key)} count={groupRows.length} property={groupProp!} optionId={key} />
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-8 px-2 py-1.5 sticky left-0 bg-muted/50 z-20" />
                  <ResizableHeader
                    label="Title"
                    type="title"
                    width={250}
                    onResize={() => {}}
                    onDelete={undefined}
                    onRename={undefined}
                    sticky
                  />
                  {displayProperties.map((prop) => (
                    <ResizableHeader
                      key={prop.id}
                      label={prop.name}
                      type={prop.type}
                      width={prop.width ?? 150}
                      onResize={(w) => onResizeProperty(prop.id, w)}
                      onDelete={() => onDeleteProperty(prop.id)}
                      onRename={onRenameProperty ? (name) => onRenameProperty(prop.id, name) : undefined}
                      isReadonly={prop.type === "created_time" || prop.type === "last_edited_time"}
                    />
                  ))}
                  <th className="w-10 px-1 py-1.5">
                    <AddProperty onAdd={onAddProperty} />
                  </th>
                </tr>
              </thead>
              {renderTableBlock(groupRows, !!hasCalc)}
            </table>
          </div>
        ))}
        <NewRowButton onClick={onCreateRow} isCreating={isCreating} count={filteredRows.length} total={rows.length} />
      </div>
    );
  }

  return (
    <div>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-8 px-2 py-1.5 sticky left-0 bg-muted/50 z-20" />
            <ResizableHeader
              label="Title"
              type="title"
              width={250}
              onResize={() => {}}
              onDelete={undefined}
              onRename={undefined}
              sticky
            />
            {displayProperties.map((prop) => (
              <ResizableHeader
                key={prop.id}
                label={prop.name}
                type={prop.type}
                width={prop.width ?? 150}
                onResize={(w) => onResizeProperty(prop.id, w)}
                onDelete={() => onDeleteProperty(prop.id)}
                onRename={onRenameProperty ? (name) => onRenameProperty(prop.id, name) : undefined}
                isReadonly={prop.type === "created_time" || prop.type === "last_edited_time"}
              />
            ))}
            <th className="w-10 px-1 py-1.5">
              <AddProperty onAdd={onAddProperty} />
            </th>
          </tr>
        </thead>
        {renderTableBlock(filteredRows, true)}
      </table>

      {filteredRows.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Table className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No rows yet</p>
          <p className="text-xs mt-1">Click + to add your first entry</p>
        </div>
      )}

      <NewRowButton onClick={onCreateRow} isCreating={isCreating} count={filteredRows.length} total={rows.length} />
    </div>
  );
}

function NewRowButton({ onClick, isCreating, count, total }: { onClick: () => void; isCreating?: boolean; count: number; total: number }) {
  return (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        className="justify-start gap-2 h-8 px-4 text-sm text-muted-foreground mt-0.5"
        onClick={onClick}
        disabled={isCreating}
      >
        <Plus className="h-4 w-4" />
        {isCreating ? "Creating..." : "New"}
      </Button>
      <span className="text-xs text-muted-foreground pr-4">
        {count}{count !== total ? ` of ${total}` : ""} row{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

function GroupHeader({ label, count, property, optionId }: { label: string; count: number; property: PropertyDefinition; optionId: string }) {
  const opt = property.options?.find((o) => o.id === optionId);
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b">
      <PropertyIcon type={property.type} className="h-3.5 w-3.5" />
      {opt ? (
        <span className="text-sm font-medium">{opt.name}</span>
      ) : (
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      )}
      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
    </div>
  );
}

function CalculationPicker({
  value,
  onChange,
  displayValue,
  isNumeric,
}: {
  value: CalculationType;
  onChange: (value: CalculationType) => void;
  displayValue: string;
  isNumeric: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const options = CALCULATION_OPTIONS.filter((o) => !o.numericOnly || isNumeric);

  return (
    <div className={cn("relative", open && "z-[100]")} ref={containerRef}>
      <button
        className="w-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50 text-left truncate h-7 flex items-center"
        onClick={() => setOpen(!open)}
      >
        {value === "none" ? (
          <span className="opacity-0 hover:opacity-100 transition-opacity">Calculate</span>
        ) : (
          <span className="font-medium tabular-nums">{displayValue}</span>
        )}
      </button>
      {open && (
        <div className="absolute bottom-full left-0 z-[100] mb-1 w-40 rounded-md border bg-popover p-1 shadow-md max-h-60 overflow-y-auto">
          {options.map((opt) => (
            <button
              key={opt.value}
              className={cn(
                "flex w-full items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent",
                value === opt.value && "bg-accent"
              )}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ResizableHeader({
  label,
  type,
  width,
  onResize,
  onDelete,
  onRename,
  isReadonly,
  sticky,
}: {
  label: string;
  type: import("@/lib/types").PropertyType;
  width: number;
  onResize: (width: number) => void;
  onDelete: (() => void) | undefined;
  onRename: ((name: string) => void) | undefined;
  isReadonly?: boolean;
  sticky?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(label);
  const startX = useRef(0);
  const startWidth = useRef(width);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      startX.current = e.clientX;
      startWidth.current = width;

      const handleMouseMove = (ev: MouseEvent) => {
        const diff = ev.clientX - startX.current;
        onResize(Math.max(80, startWidth.current + diff));
      };
      const handleMouseUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [width, onResize]
  );

  const startEditing = () => {
    if (!onRename || isReadonly) return;
    setEditName(label);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commitRename = () => {
    setEditing(false);
    if (editName.trim() && editName.trim() !== label) {
      onRename?.(editName.trim());
    }
  };

  return (
    <th
      className={cn(
        "relative text-left px-2 py-1.5 font-medium text-muted-foreground text-xs tracking-wider border-r group/th",
        sticky && "sticky left-8 bg-muted/50 z-20"
      )}
      style={{ width, minWidth: width, maxWidth: width }}
    >
      <div className="flex items-center gap-1.5">
        <PropertyIcon type={type} className="h-3 w-3 shrink-0 opacity-60" />
        {editing ? (
          <input
            ref={inputRef}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
            className="bg-transparent outline-none text-xs font-medium w-full border-b border-ring"
          />
        ) : (
          <span
            className={cn("truncate", onRename && !isReadonly && "cursor-text")}
            onDoubleClick={startEditing}
          >
            {label}
          </span>
        )}
        {onDelete && !editing && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                className="opacity-0 group-hover/th:opacity-100 text-muted-foreground hover:text-destructive transition-opacity ml-auto shrink-0"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete property</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the &quot;{label}&quot; property? This will remove it from all rows.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <div
        className={cn(
          "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-ring",
          dragging && "bg-ring"
        )}
        onMouseDown={handleMouseDown}
      />
    </th>
  );
}
