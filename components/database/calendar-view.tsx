"use client";

import { useState, useMemo } from "react";
import type { Page } from "@prisma/client";
import type { PropertyDefinition, FilterRule, SortRule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { applyFiltersAndSorts } from "./filter-sort-utils";

interface CalendarViewProps {
  rows: Page[];
  properties: PropertyDefinition[];
  filters: FilterRule[];
  sorts: SortRule[];
  datePropertyId?: string;
  onCreateRow: (properties?: Record<string, unknown>) => void;
  onRowClick: (row: Page) => void;
  isCreating?: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Pad start with days from previous month
  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Pad end to fill 6 rows
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarView({
  rows,
  properties,
  filters,
  sorts,
  datePropertyId,
  onCreateRow,
  onRowClick,
  isCreating,
}: CalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const filteredRows = applyFiltersAndSorts(rows, properties, filters, sorts);
  const dateProp = properties.find((p) => p.id === datePropertyId);

  const days = useMemo(
    () => getDaysInMonth(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const getRowsForDay = (day: Date): Page[] => {
    if (!datePropertyId) return [];
    return filteredRows.filter((row) => {
      const rawRp = row.rowProperties ?? {};
      const rowProps = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
      const val = dateProp?.type === "created_time"
        ? row.createdAt
        : dateProp?.type === "last_edited_time"
        ? row.updatedAt
        : rowProps[datePropertyId];
      if (!val) return false;
      const d = new Date(String(val));
      return !isNaN(d.getTime()) && isSameDay(d, day);
    });
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
  };

  if (!dateProp) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Calendar className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No date property selected</p>
        <p className="text-xs mt-1">
          Open view settings and choose a date property to display items on the calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={goToToday}>
            Today
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {DAYS.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 border-l">
        {days.map((day, idx) => {
          const isCurrentMonth = day.getMonth() === currentMonth;
          const isToday = isSameDay(day, today);
          const dayRows = getRowsForDay(day);

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[100px] border-r border-b p-1 transition-colors",
                !isCurrentMonth && "bg-muted/30",
                isToday && "bg-blue-50/50 dark:bg-blue-950/20"
              )}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span
                  className={cn(
                    "text-xs font-medium h-6 w-6 flex items-center justify-center rounded-full",
                    isToday && "bg-primary text-primary-foreground",
                    !isCurrentMonth && "text-muted-foreground"
                  )}
                >
                  {day.getDate()}
                </span>
                {datePropertyId && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 hover:opacity-100 h-5 w-5 text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateRow({ [datePropertyId]: toDateString(day) });
                    }}
                    disabled={isCreating}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <div className="space-y-0.5">
                {dayRows.slice(0, 3).map((row) => (
                  <button
                    key={row.id}
                    className="w-full text-left text-[11px] px-1 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-foreground truncate transition-colors"
                    onClick={() => onRowClick(row)}
                  >
                    {row.icon && <span className="mr-0.5">{row.icon}</span>}
                    {row.title || "Untitled"}
                  </button>
                ))}
                {dayRows.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1">
                    +{dayRows.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
