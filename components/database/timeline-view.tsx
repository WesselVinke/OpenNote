"use client";

import { useState, useMemo } from "react";
import type { Page } from "@prisma/client";
import type { PropertyDefinition, FilterRule, SortRule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyFiltersAndSorts } from "./filter-sort-utils";

interface TimelineViewProps {
  rows: Page[];
  properties: PropertyDefinition[];
  filters: FilterRule[];
  sorts: SortRule[];
  startPropertyId?: string;
  endPropertyId?: string;
  onCreateRow: (properties?: Record<string, unknown>) => void;
  onRowClick: (row: Page) => void;
  isCreating?: boolean;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const TIMELINE_COLORS = [
  "bg-blue-400 dark:bg-blue-600",
  "bg-green-400 dark:bg-green-600",
  "bg-purple-400 dark:bg-purple-600",
  "bg-orange-400 dark:bg-orange-600",
  "bg-pink-400 dark:bg-pink-600",
  "bg-cyan-400 dark:bg-cyan-600",
  "bg-amber-400 dark:bg-amber-600",
  "bg-red-400 dark:bg-red-600",
];

function getDateValue(row: Page, propertyId: string | undefined, properties: PropertyDefinition[]): Date | null {
  if (!propertyId) return null;
  const prop = properties.find((p) => p.id === propertyId);
  if (!prop) return null;

  let val: unknown;
  if (prop.type === "created_time") val = row.createdAt;
  else if (prop.type === "last_edited_time") val = row.updatedAt;
  else {
    const rawRp = row.rowProperties ?? {};
    const rp = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
    val = rp[propertyId];
  }
  if (!val) return null;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? null : d;
}

function getDaysInRange(start: Date, end: Date): number {
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function TimelineView({
  rows,
  properties,
  filters,
  sorts,
  startPropertyId,
  endPropertyId,
  onCreateRow,
  onRowClick,
  isCreating,
}: TimelineViewProps) {
  const today = new Date();
  const [viewStart, setViewStart] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return d;
  });

  const filteredRows = applyFiltersAndSorts(rows, properties, filters, sorts);
  const totalDays = 42; // 6 weeks view
  const dayWidth = 32;

  const startProp = properties.find((p) => p.id === startPropertyId);

  const timelineItems = useMemo(() => {
    if (!startPropertyId) return [];
    return filteredRows
      .map((row, idx) => {
        const start = getDateValue(row, startPropertyId, properties);
        if (!start) return null;
        const end = endPropertyId
          ? getDateValue(row, endPropertyId, properties) ?? start
          : start;
        return { row, start, end, colorIdx: idx % TIMELINE_COLORS.length };
      })
      .filter(Boolean) as { row: Page; start: Date; end: Date; colorIdx: number }[];
  }, [filteredRows, startPropertyId, endPropertyId, properties]);

  const days = useMemo(() => {
    const result: Date[] = [];
    for (let i = 0; i < totalDays; i++) {
      result.push(addDays(viewStart, i));
    }
    return result;
  }, [viewStart]);

  // Group days by month for header
  const monthHeaders = useMemo(() => {
    const headers: { label: string; span: number }[] = [];
    let currentMonth = -1;
    for (const day of days) {
      const m = day.getMonth();
      if (m !== currentMonth) {
        headers.push({ label: `${MONTHS_SHORT[m]} ${day.getFullYear()}`, span: 1 });
        currentMonth = m;
      } else {
        headers[headers.length - 1].span++;
      }
    }
    return headers;
  }, [days]);

  const scrollPrev = () => setViewStart(addDays(viewStart, -14));
  const scrollNext = () => setViewStart(addDays(viewStart, 14));
  const goToToday = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setViewStart(d);
  };

  if (!startProp) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <CalendarRange className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No date property selected</p>
        <p className="text-xs mt-1">
          Configure start and end date properties to display items on the timeline.
        </p>
      </div>
    );
  }

  const todayOffset = Math.floor((today.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="p-4">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={scrollPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={scrollNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <div style={{ minWidth: dayWidth * totalDays + 200 }}>
          {/* Month header */}
          <div className="flex border-b bg-muted/30">
            <div className="w-[200px] shrink-0 px-3 py-1.5 text-xs font-medium text-muted-foreground border-r sticky left-0 bg-muted/30 z-10">
              Name
            </div>
            <div className="flex">
              {monthHeaders.map((mh, i) => (
                <div
                  key={i}
                  className="text-xs font-medium text-muted-foreground px-1 py-1.5 border-r text-center"
                  style={{ width: mh.span * dayWidth }}
                >
                  {mh.label}
                </div>
              ))}
            </div>
          </div>

          {/* Day header */}
          <div className="flex border-b bg-muted/50">
            <div className="w-[200px] shrink-0 border-r sticky left-0 bg-muted/50 z-10" />
            <div className="flex">
              {days.map((day, i) => {
                const isToday =
                  day.getDate() === today.getDate() &&
                  day.getMonth() === today.getMonth() &&
                  day.getFullYear() === today.getFullYear();
                const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                return (
                  <div
                    key={i}
                    className={cn(
                      "text-center text-[10px] py-1 border-r",
                      isToday && "bg-primary/10 font-bold text-primary",
                      isWeekend && !isToday && "text-muted-foreground/50"
                    )}
                    style={{ width: dayWidth }}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rows */}
          {timelineItems.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <p className="text-sm">No items with dates to display</p>
            </div>
          ) : (
            timelineItems.map(({ row, start, end, colorIdx }) => {
              const startOffset = Math.floor(
                (start.getTime() - viewStart.getTime()) / (1000 * 60 * 60 * 24)
              );
              const duration = getDaysInRange(start, end);
              const barLeft = Math.max(0, startOffset) * dayWidth;
              const barWidth = Math.max(1, Math.min(duration, totalDays - Math.max(0, startOffset))) * dayWidth;
              const isVisible = startOffset + duration > 0 && startOffset < totalDays;

              return (
                <div key={row.id} className="flex border-b hover:bg-muted/20 group">
                  <div
                    className="w-[200px] shrink-0 px-3 py-2 text-sm truncate border-r cursor-pointer hover:underline sticky left-0 bg-background z-10 flex items-center gap-1.5"
                    onClick={() => onRowClick(row)}
                  >
                    {row.icon && <span className="shrink-0 text-sm">{row.icon}</span>}
                    <span className="truncate">{row.title || "Untitled"}</span>
                  </div>
                  <div className="relative" style={{ width: totalDays * dayWidth, height: 36 }}>
                    {/* Today line */}
                    {todayOffset >= 0 && todayOffset < totalDays && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-400 z-[5]"
                        style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
                      />
                    )}
                    {isVisible && (
                      <div
                        className={cn(
                          "absolute top-1.5 h-5 rounded-full cursor-pointer hover:opacity-80 transition-opacity flex items-center px-2",
                          TIMELINE_COLORS[colorIdx]
                        )}
                        style={{
                          left: barLeft,
                          width: Math.max(barWidth, dayWidth),
                        }}
                        onClick={() => onRowClick(row)}
                        title={`${row.title || "Untitled"}: ${start.toLocaleDateString()} – ${end.toLocaleDateString()}`}
                      >
                        <span className="text-[10px] text-white font-medium truncate">
                          {row.title || "Untitled"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Button
        variant="ghost"
        className="w-full justify-start gap-2 h-8 px-4 text-sm text-muted-foreground mt-2"
        onClick={() => onCreateRow()}
        disabled={isCreating}
      >
        <Plus className="h-4 w-4" />
        {isCreating ? "Creating..." : "New"}
      </Button>
    </div>
  );
}
