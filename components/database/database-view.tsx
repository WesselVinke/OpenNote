"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Page } from "@prisma/client";
import type {
  PropertyDefinition,
  DatabaseView as DBView,
  SelectOption,
  ViewType,
  CalculationType,
  PropertyType,
} from "@/lib/types";
import {
  useDatabaseRows,
  useCreateRow,
  useDatabaseViews,
  useUpdateViews,
} from "@/lib/hooks/use-database";
import { useUpdatePage } from "@/lib/hooks/use-pages";
import { DEFAULT_STATUS_OPTIONS } from "@/lib/utils/constants";
import { PROPERTY_TYPES } from "./add-property";
import { ViewTabs } from "./view-tabs";
import { TableView } from "./table-view";
import { BoardView } from "./board-view";
import { GalleryView } from "./gallery-view";
import { CalendarView } from "./calendar-view";
import { ListView } from "./list-view";
import { TimelineView } from "./timeline-view";
import { FilterBar } from "./filter-bar";
import { SortBar } from "./sort-bar";
import { PropertiesPanel } from "./properties-panel";
import { RowModal } from "./row-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, X, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatabaseViewProps {
  database: Page;
}

export function DatabaseView({ database }: DatabaseViewProps) {
  const { data: rows, isLoading: rowsLoading } = useDatabaseRows(database.id);
  const { data: viewsData } = useDatabaseViews(database.id);
  const createRow = useCreateRow();
  const updatePage = useUpdatePage();
  const updateViewsMutation = useUpdateViews();

  const definedProperties: PropertyDefinition[] = useMemo(() => {
    const raw = database.dbProperties;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return (parsed as PropertyDefinition[] | null) ?? [
      { id: "title", name: "Name", type: "title" as const },
    ];
  }, [database.dbProperties]);

  // Auto-discover properties from row data that aren't in dbProperties
  const properties: PropertyDefinition[] = useMemo(() => {
    if (!rows || rows.length === 0) return definedProperties;
    const knownIds = new Set(definedProperties.map((p) => p.id));
    const discovered = new Map<string, PropertyDefinition>();
    for (const row of rows) {
      const rawRp = row.rowProperties ?? {};
      const rp = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
      for (const key of Object.keys(rp)) {
        if (!knownIds.has(key) && !discovered.has(key)) {
          discovered.set(key, {
            id: key,
            name: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
            type: "text" as const,
          });
        }
      }
    }
    if (discovered.size === 0) return definedProperties;
    return [...definedProperties, ...discovered.values()];
  }, [definedProperties, rows]);

  const defaultView: DBView = useMemo(
    () => ({
      id: "default",
      name: "Table view",
      type: "table" as ViewType,
      filters: [],
      sorts: [],
      visibleProperties: properties.map((p) => p.id),
    }),
    [properties]
  );

  // IDs of properties discovered from row data (not in dbProperties)
  const discoveredIds = useMemo(() => {
    const knownIds = new Set(definedProperties.map((p) => p.id));
    return properties.filter((p) => !knownIds.has(p.id)).map((p) => p.id);
  }, [definedProperties, properties]);

  const views: DBView[] = useMemo(() => {
    const raw = viewsData;
    const v = (typeof raw === "string" ? JSON.parse(raw) : raw) as DBView[] | undefined;
    if (!v || v.length === 0) return [defaultView];
    // Auto-add discovered properties to each view's visibleProperties
    if (discoveredIds.length === 0) return v;
    return v.map((view) => {
      const missing = discoveredIds.filter((id) => !view.visibleProperties.includes(id));
      if (missing.length === 0) return view;
      return { ...view, visibleProperties: [...view.visibleProperties, ...missing] };
    });
  }, [viewsData, defaultView, discoveredIds]);

  const [activeViewId, setActiveViewId] = useState(views[0]?.id ?? "default");
  const activeView = views.find((v) => v.id === activeViewId) ?? views[0];

  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const selectedRow = useMemo(
    () => (rows ?? []).find((r) => r.id === selectedRowId) ?? null,
    [rows, selectedRowId]
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Sync active view when views list changes (e.g. view deleted)
  const activeViewExists = views.some((v) => v.id === activeViewId);
  const fallbackViewId = views[0]?.id ?? "default";
  useEffect(() => {
    if (!activeViewExists) {
      setActiveViewId(fallbackViewId);
    }
  }, [activeViewExists, fallbackViewId]);

  // Filtered rows by search query
  const searchedRows = useMemo(() => {
    if (!rows || !searchQuery.trim()) return rows ?? [];
    const q = searchQuery.toLowerCase();
    return rows.filter((row) => {
      if (row.title?.toLowerCase().includes(q)) return true;
      const rawRp = row.rowProperties ?? {};
      const rp = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
      return Object.values(rp).some((val) => {
        if (val == null) return false;
        return String(val).toLowerCase().includes(q);
      });
    });
  }, [rows, searchQuery]);

  const saveViews = useCallback(
    (newViews: DBView[]) => {
      updateViewsMutation.mutate({ databaseId: database.id, views: newViews });
    },
    [database.id, updateViewsMutation]
  );

  const updateActiveView = useCallback(
    (patch: Partial<DBView>) => {
      const newViews = views.map((v) =>
        v.id === activeViewId ? { ...v, ...patch } : v
      );
      saveViews(newViews);
    },
    [views, activeViewId, saveViews]
  );

  const handleCreateRow = useCallback(
    (extraProps?: Record<string, unknown>) => {
      createRow.mutate({
        databaseId: database.id,
        rowProperties: extraProps,
      });
    },
    [createRow, database.id]
  );

  const handleDeleteRow = useCallback(
    (rowId: string) => {
      updatePage.mutate({ id: rowId, isDeleted: true } as { id: string } & Partial<Page>);
    },
    [updatePage]
  );

  const handleDuplicateRow = useCallback(
    (row: Page) => {
      const rawRowProps = row.rowProperties ?? {};
      const rowProps = (typeof rawRowProps === "string" ? JSON.parse(rawRowProps) : rawRowProps) as Record<string, unknown>;
      createRow.mutate({
        databaseId: database.id,
        title: row.title ? `${row.title} (copy)` : "Untitled",
        rowProperties: { ...rowProps },
      });
    },
    [createRow, database.id]
  );

  const handleUpdateRowTitle = useCallback(
    (rowId: string, title: string) => {
      updatePage.mutate({ id: rowId, title });
    },
    [updatePage]
  );

  const handleUpdateRowProperty = useCallback(
    (rowId: string, propertyId: string, value: unknown) => {
      const allRows = rows ?? [];
      const row = allRows.find((r) => r.id === rowId);
      if (!row) return;
      const rawExisting = row.rowProperties ?? {};
      const existing = (typeof rawExisting === "string" ? JSON.parse(rawExisting) : rawExisting) as Record<string, unknown>;
      updatePage.mutate({
        id: rowId,
        rowProperties: { ...existing, [propertyId]: value },
      } as { id: string } & Partial<Page>);
    },
    [rows, updatePage]
  );

  const handleAddProperty = useCallback(
    (prop: PropertyDefinition) => {
      const newProps = [...properties, prop];
      updatePage.mutate({
        id: database.id,
        dbProperties: newProps as unknown as undefined,
      });
      // Auto-add to visible properties
      if (activeView.visibleProperties.length > 0) {
        updateActiveView({
          visibleProperties: [...activeView.visibleProperties, prop.id],
        });
      }
    },
    [properties, database.id, updatePage, activeView, updateActiveView]
  );

  const handleDeleteProperty = useCallback(
    (propertyId: string) => {
      const newProps = properties.filter((p) => p.id !== propertyId);
      updatePage.mutate({
        id: database.id,
        dbProperties: newProps as unknown as undefined,
      });
    },
    [properties, database.id, updatePage]
  );

  const handleRenameProperty = useCallback(
    (propertyId: string, name: string) => {
      const newProps = properties.map((p) =>
        p.id === propertyId ? { ...p, name } : p
      );
      updatePage.mutate({
        id: database.id,
        dbProperties: newProps as unknown as undefined,
      });
    },
    [properties, database.id, updatePage]
  );

  const handleResizeProperty = useCallback(
    (propertyId: string, width: number) => {
      const newProps = properties.map((p) =>
        p.id === propertyId ? { ...p, width } : p
      );
      updatePage.mutate({
        id: database.id,
        dbProperties: newProps as unknown as undefined,
      });
    },
    [properties, database.id, updatePage]
  );

  const handleOptionsChange = useCallback(
    (propertyId: string, options: SelectOption[]) => {
      const newProps = properties.map((p) =>
        p.id === propertyId ? { ...p, options } : p
      );
      updatePage.mutate({
        id: database.id,
        dbProperties: newProps as unknown as undefined,
      });
    },
    [properties, database.id, updatePage]
  );

  const handleChangePropertyType = useCallback(
    (propertyId: string, newType: PropertyType) => {
      const defaultNames = new Set(PROPERTY_TYPES.map((pt) => pt.label));
      defaultNames.add("Property");
      const newTypeLabel = PROPERTY_TYPES.find((pt) => pt.type === newType)?.label ?? "Property";
      const newProps = properties.map((p) => {
        if (p.id !== propertyId) return p;
        return {
          ...p,
          type: newType,
          name: defaultNames.has(p.name) ? newTypeLabel : p.name,
          options: newType === "status"
            ? [...DEFAULT_STATUS_OPTIONS]
            : newType === "select" || newType === "multi_select"
            ? []
            : undefined,
        };
      });
      updatePage.mutate({
        id: database.id,
        dbProperties: newProps as unknown as undefined,
      });
    },
    [properties, database.id, updatePage]
  );

  const handleToggleVisibility = useCallback(
    (propertyId: string) => {
      const current = activeView.visibleProperties.length > 0
        ? activeView.visibleProperties
        : properties.map((p) => p.id);
      const isVisible = current.includes(propertyId);
      updateActiveView({
        visibleProperties: isVisible
          ? current.filter((id) => id !== propertyId)
          : [...current, propertyId],
      });
    },
    [activeView, properties, updateActiveView]
  );

  const handleShowAll = useCallback(() => {
    updateActiveView({ visibleProperties: properties.map((p) => p.id) });
  }, [properties, updateActiveView]);

  const handleHideAll = useCallback(() => {
    // Keep only title visible
    updateActiveView({ visibleProperties: ["title"] });
  }, [updateActiveView]);

  const handleCalculationChange = useCallback(
    (propertyId: string, calculation: CalculationType) => {
      const current = activeView.calculations ?? {};
      updateActiveView({
        calculations: { ...current, [propertyId]: calculation },
      });
    },
    [activeView, updateActiveView]
  );

  if (rowsLoading) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  const showGroupBy = activeView?.type === "board" || activeView?.type === "table";
  const groupableProperties = properties.filter(
    (p) => p.type === "select" || p.type === "status" || p.type === "multi_select"
  );

  return (
    <div>
      <ViewTabs
        views={views}
        activeViewId={activeViewId}
        onSelectView={setActiveViewId}
        onUpdateViews={saveViews}
        groupablePropertyIds={groupableProperties.map((p) => p.id)}
      />

      <div className="flex items-center gap-2 px-4 py-2 border-b flex-wrap">
        <FilterBar
          properties={properties}
          filters={activeView?.filters ?? []}
          onChange={(filters) => updateActiveView({ filters })}
        />
        <SortBar
          properties={properties}
          sorts={activeView?.sorts ?? []}
          onChange={(sorts) => updateActiveView({ sorts })}
        />

        <PropertiesPanel
          properties={properties}
          visibleProperties={activeView?.visibleProperties ?? []}
          onToggleVisibility={handleToggleVisibility}
          onShowAll={handleShowAll}
          onHideAll={handleHideAll}
          onChangePropertyType={handleChangePropertyType}
        />

        {/* Search */}
        {showSearch ? (
          <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1">
            <Search className="h-3 w-3 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="bg-transparent outline-none text-xs w-32"
              autoFocus
            />
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 h-7 text-xs"
            onClick={() => setShowSearch(true)}
          >
            <Search className="h-3 w-3" />
            Search
          </Button>
        )}

        {/* Group by for board and table */}
        {showGroupBy && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Group by</span>
            <select
              value={activeView?.groupBy ?? ""}
              onChange={(e) =>
                updateActiveView({ groupBy: e.target.value || undefined })
              }
              className="bg-transparent border rounded px-2 py-1 text-xs outline-none"
            >
              <option value="">None</option>
              {groupableProperties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Board: hide empty groups */}
        {activeView?.type === "board" && activeView.groupBy && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={activeView.hideEmptyGroups ?? false}
              onChange={(e) =>
                updateActiveView({ hideEmptyGroups: e.target.checked })
              }
              className="rounded"
            />
            <EyeOff className="h-3 w-3" />
            Hide empty
          </label>
        )}

        {/* Calendar: date property select */}
        {activeView?.type === "calendar" && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Date</span>
            <select
              value={activeView.calendarByProperty ?? ""}
              onChange={(e) =>
                updateActiveView({ calendarByProperty: e.target.value || undefined })
              }
              className="bg-transparent border rounded px-2 py-1 text-xs outline-none"
            >
              <option value="">Select property...</option>
              {properties
                .filter((p) => p.type === "date" || p.type === "created_time" || p.type === "last_edited_time")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Timeline: start/end date property selects */}
        {activeView?.type === "timeline" && (
          <>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">Start</span>
              <select
                value={activeView.timelineByProperty ?? ""}
                onChange={(e) =>
                  updateActiveView({ timelineByProperty: e.target.value || undefined })
                }
                className="bg-transparent border rounded px-2 py-1 text-xs outline-none"
              >
                <option value="">Select property...</option>
                {properties
                  .filter((p) => p.type === "date" || p.type === "created_time" || p.type === "last_edited_time")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-muted-foreground">End</span>
              <select
                value={activeView.timelineEndProperty ?? ""}
                onChange={(e) =>
                  updateActiveView({ timelineEndProperty: e.target.value || undefined })
                }
                className="bg-transparent border rounded px-2 py-1 text-xs outline-none"
              >
                <option value="">Same as start</option>
                {properties
                  .filter((p) => p.type === "date" || p.type === "created_time" || p.type === "last_edited_time")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          </>
        )}

        {/* Gallery: card size */}
        {activeView?.type === "gallery" && (
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">Size</span>
            <select
              value={activeView.galleryCardSize ?? "medium"}
              onChange={(e) =>
                updateActiveView({ galleryCardSize: e.target.value as "small" | "medium" | "large" })
              }
              className="bg-transparent border rounded px-2 py-1 text-xs outline-none"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </div>
        )}
      </div>

      {activeView?.type === "board" ? (
        <BoardView
          rows={searchedRows}
          properties={properties}
          groupByPropertyId={activeView.groupBy}
          filters={activeView.filters}
          sorts={activeView.sorts}
          onUpdateRowProperty={handleUpdateRowProperty}
          onCreateRow={handleCreateRow}
          onRowClick={(row) => setSelectedRowId(row.id)}
          onOptionsChange={handleOptionsChange}
          isCreating={createRow.isPending}
          hideEmptyGroups={activeView.hideEmptyGroups}
          cardProperties={activeView.cardProperties}
        />
      ) : activeView?.type === "gallery" ? (
        <GalleryView
          rows={searchedRows}
          properties={properties}
          filters={activeView.filters}
          sorts={activeView.sorts}
          onCreateRow={() => handleCreateRow()}
          onRowClick={(row) => setSelectedRowId(row.id)}
          onUpdateRowProperty={handleUpdateRowProperty}
          onOptionsChange={handleOptionsChange}
          isCreating={createRow.isPending}
          cardSize={activeView.galleryCardSize ?? "medium"}
          visibleProperties={activeView.visibleProperties}
        />
      ) : activeView?.type === "calendar" ? (
        <CalendarView
          rows={searchedRows}
          properties={properties}
          filters={activeView.filters}
          sorts={activeView.sorts}
          datePropertyId={activeView.calendarByProperty}
          onCreateRow={handleCreateRow}
          onRowClick={(row) => setSelectedRowId(row.id)}
          isCreating={createRow.isPending}
        />
      ) : activeView?.type === "timeline" ? (
        <TimelineView
          rows={searchedRows}
          properties={properties}
          filters={activeView.filters}
          sorts={activeView.sorts}
          startPropertyId={activeView.timelineByProperty}
          endPropertyId={activeView.timelineEndProperty}
          onCreateRow={handleCreateRow}
          onRowClick={(row) => setSelectedRowId(row.id)}
          isCreating={createRow.isPending}
        />
      ) : activeView?.type === "list" ? (
        <ListView
          rows={searchedRows}
          properties={properties}
          filters={activeView.filters}
          sorts={activeView.sorts}
          onCreateRow={() => handleCreateRow()}
          onDeleteRow={handleDeleteRow}
          onRowClick={(row) => setSelectedRowId(row.id)}
          onUpdateRowProperty={handleUpdateRowProperty}
          onOptionsChange={handleOptionsChange}
          isCreating={createRow.isPending}
          visibleProperties={activeView.visibleProperties}
        />
      ) : (
        <TableView
          rows={searchedRows}
          properties={properties}
          filters={activeView?.filters ?? []}
          sorts={activeView?.sorts ?? []}
          visibleProperties={activeView?.visibleProperties}
          calculations={activeView?.calculations}
          groupBy={activeView?.groupBy}
          onCreateRow={() => handleCreateRow()}
          onDeleteRow={handleDeleteRow}
          onDuplicateRow={handleDuplicateRow}
          onUpdateRowTitle={handleUpdateRowTitle}
          onUpdateRowProperty={handleUpdateRowProperty}
          onAddProperty={handleAddProperty}
          onDeleteProperty={handleDeleteProperty}
          onRenameProperty={handleRenameProperty}
          onResizeProperty={handleResizeProperty}
          onOptionsChange={handleOptionsChange}
          onRowClick={(row) => setSelectedRowId(row.id)}
          onCalculationChange={handleCalculationChange}
          isCreating={createRow.isPending}
        />
      )}

      <RowModal
        open={!!selectedRow}
        onClose={() => setSelectedRowId(null)}
        row={selectedRow}
        properties={properties}
        onUpdateProperty={handleUpdateRowProperty}
        onOptionsChange={handleOptionsChange}
      />
    </div>
  );
}
