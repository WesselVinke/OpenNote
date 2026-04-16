import type { Page } from "@prisma/client";
import type { PropertyDefinition, FilterRule, SortRule } from "@/lib/types";

export function applyFiltersAndSorts(
  rows: Page[],
  properties: PropertyDefinition[],
  filters: FilterRule[],
  sorts: SortRule[]
): Page[] {
  let result = [...rows];

  for (const filter of filters) {
    const prop = properties.find((p) => p.id === filter.propertyId);
    if (!prop) continue;

    result = result.filter((row) => {
      const rawRp = row.rowProperties ?? {};
      const rowProps = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
      let val: unknown;
      if (prop.type === "title") {
        val = row.title;
      } else if (prop.type === "created_time") {
        val = row.createdAt;
      } else if (prop.type === "last_edited_time") {
        val = row.updatedAt;
      } else {
        val = rowProps[prop.id];
      }
      return matchesFilter(val, filter, prop.type);
    });
  }

  if (sorts.length > 0) {
    result.sort((a, b) => {
      for (const sort of sorts) {
        const prop = properties.find((p) => p.id === sort.propertyId);
        if (!prop) continue;
        const aProps = (a.rowProperties ?? {}) as Record<string, unknown>;
        const bProps = (b.rowProperties ?? {}) as Record<string, unknown>;
        let aVal: unknown, bVal: unknown;
        if (prop.type === "title") {
          aVal = a.title;
          bVal = b.title;
        } else if (prop.type === "created_time") {
          aVal = a.createdAt;
          bVal = b.createdAt;
        } else if (prop.type === "last_edited_time") {
          aVal = a.updatedAt;
          bVal = b.updatedAt;
        } else {
          aVal = aProps[prop.id];
          bVal = bProps[prop.id];
        }
        const cmp = compareValues(aVal, bVal);
        if (cmp !== 0) return sort.direction === "ascending" ? cmp : -cmp;
      }
      return 0;
    });
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function matchesFilter(value: unknown, filter: FilterRule, _propType: string): boolean {
  const str = value == null ? "" : String(value);
  const filterVal = filter.value == null ? "" : String(filter.value);

  switch (filter.operator) {
    case "is":
      return str === filterVal;
    case "is_not":
      return str !== filterVal;
    case "contains":
      return str.toLowerCase().includes(filterVal.toLowerCase());
    case "does_not_contain":
      return !str.toLowerCase().includes(filterVal.toLowerCase());
    case "is_empty":
      return !str && (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0));
    case "is_not_empty":
      return !!str || (Array.isArray(value) && value.length > 0);

    // Number operators
    case "greater_than": {
      const num = typeof value === "number" ? value : Number(str);
      const target = Number(filterVal);
      return !isNaN(num) && !isNaN(target) && num > target;
    }
    case "less_than": {
      const num = typeof value === "number" ? value : Number(str);
      const target = Number(filterVal);
      return !isNaN(num) && !isNaN(target) && num < target;
    }
    case "greater_than_or_equal": {
      const num = typeof value === "number" ? value : Number(str);
      const target = Number(filterVal);
      return !isNaN(num) && !isNaN(target) && num >= target;
    }
    case "less_than_or_equal": {
      const num = typeof value === "number" ? value : Number(str);
      const target = Number(filterVal);
      return !isNaN(num) && !isNaN(target) && num <= target;
    }

    // Date operators
    case "before": {
      const d = toDate(value);
      const target = toDate(filterVal);
      return d !== null && target !== null && d < target;
    }
    case "after": {
      const d = toDate(value);
      const target = toDate(filterVal);
      return d !== null && target !== null && d > target;
    }
    case "on_or_before": {
      const d = toDate(value);
      const target = toDate(filterVal);
      return d !== null && target !== null && d <= target;
    }
    case "on_or_after": {
      const d = toDate(value);
      const target = toDate(filterVal);
      return d !== null && target !== null && d >= target;
    }
    case "past_week": {
      const d = toDate(value);
      if (!d) return false;
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo && d <= now;
    }
    case "past_month": {
      const d = toDate(value);
      if (!d) return false;
      const now = new Date();
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return d >= monthAgo && d <= now;
    }
    case "next_week": {
      const d = toDate(value);
      if (!d) return false;
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return d >= now && d <= weekLater;
    }
    case "next_month": {
      const d = toDate(value);
      if (!d) return false;
      const now = new Date();
      const monthLater = new Date(now);
      monthLater.setMonth(monthLater.getMonth() + 1);
      return d >= now && d <= monthLater;
    }

    default:
      return true;
  }
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (!value) return null;
  const d = new Date(String(value));
  return isNaN(d.getTime()) ? null : d;
}

function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  // Date comparison
  const aDate = toDate(a);
  const bDate = toDate(b);
  if (aDate && bDate) return aDate.getTime() - bDate.getTime();

  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return (a ? 1 : 0) - (b ? 1 : 0);

  return String(a).localeCompare(String(b));
}
