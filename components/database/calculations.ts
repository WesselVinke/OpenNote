import type { Page } from "@prisma/client";
import type { CalculationType, PropertyDefinition } from "@/lib/types";

export const CALCULATION_OPTIONS: { value: CalculationType; label: string; numericOnly?: boolean }[] = [
  { value: "none", label: "None" },
  { value: "count", label: "Count all" },
  { value: "count_values", label: "Count values" },
  { value: "count_unique", label: "Count unique" },
  { value: "count_empty", label: "Count empty" },
  { value: "count_not_empty", label: "Count not empty" },
  { value: "percent_empty", label: "Percent empty" },
  { value: "percent_not_empty", label: "Percent not empty" },
  { value: "sum", label: "Sum", numericOnly: true },
  { value: "average", label: "Average", numericOnly: true },
  { value: "median", label: "Median", numericOnly: true },
  { value: "min", label: "Min", numericOnly: true },
  { value: "max", label: "Max", numericOnly: true },
  { value: "range", label: "Range", numericOnly: true },
];

export function calculate(
  rows: Page[],
  property: PropertyDefinition,
  calculation: CalculationType
): string {
  if (calculation === "none") return "";

  const values = rows.map((row) => {
    if (property.type === "title") return row.title;
    if (property.type === "created_time") return row.createdAt;
    if (property.type === "last_edited_time") return row.updatedAt;
    const rawRp = row.rowProperties ?? {};
    const rp = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;
    return rp[property.id];
  });

  const total = rows.length;

  switch (calculation) {
    case "count":
      return String(total);

    case "count_values":
      return String(values.filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length);

    case "count_unique": {
      const set = new Set(values.map((v) => (v == null ? "" : JSON.stringify(v))));
      return String(set.size);
    }

    case "count_empty":
      return String(values.filter((v) => v == null || v === "" || (Array.isArray(v) && v.length === 0)).length);

    case "count_not_empty":
      return String(values.filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length);

    case "percent_empty": {
      if (total === 0) return "0%";
      const empty = values.filter((v) => v == null || v === "" || (Array.isArray(v) && v.length === 0)).length;
      return `${Math.round((empty / total) * 100)}%`;
    }

    case "percent_not_empty": {
      if (total === 0) return "0%";
      const notEmpty = values.filter((v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0)).length;
      return `${Math.round((notEmpty / total) * 100)}%`;
    }

    case "sum": {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      return nums.length > 0 ? String(nums.reduce((a, b) => a + b, 0)) : "";
    }

    case "average": {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      if (nums.length === 0) return "";
      return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
    }

    case "median": {
      const nums = values.map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b);
      if (nums.length === 0) return "";
      const mid = Math.floor(nums.length / 2);
      return nums.length % 2 !== 0
        ? String(nums[mid])
        : ((nums[mid - 1] + nums[mid]) / 2).toFixed(1);
    }

    case "min": {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      return nums.length > 0 ? String(Math.min(...nums)) : "";
    }

    case "max": {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      return nums.length > 0 ? String(Math.max(...nums)) : "";
    }

    case "range": {
      const nums = values.map(Number).filter((n) => !isNaN(n));
      if (nums.length === 0) return "";
      return String(Math.max(...nums) - Math.min(...nums));
    }

    default:
      return "";
  }
}
