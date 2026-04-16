"use client";

import { useState } from "react";
import type { PropertyDefinition, FilterRule, FilterOperator, PropertyType } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { Button } from "@/components/ui/button";
import { Filter, X, Plus } from "lucide-react";

const TEXT_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "does_not_contain", label: "does not contain" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const NUMBER_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "is", label: "=" },
  { value: "is_not", label: "≠" },
  { value: "greater_than", label: ">" },
  { value: "less_than", label: "<" },
  { value: "greater_than_or_equal", label: "≥" },
  { value: "less_than_or_equal", label: "≤" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const DATE_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "is", label: "is" },
  { value: "before", label: "is before" },
  { value: "after", label: "is after" },
  { value: "on_or_before", label: "is on or before" },
  { value: "on_or_after", label: "is on or after" },
  { value: "past_week", label: "past week" },
  { value: "past_month", label: "past month" },
  { value: "next_week", label: "next week" },
  { value: "next_month", label: "next month" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const CHECKBOX_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
];

const SELECT_OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "is_empty", label: "is empty" },
  { value: "is_not_empty", label: "is not empty" },
];

const NO_VALUE_OPERATORS: FilterOperator[] = [
  "is_empty", "is_not_empty", "past_week", "past_month", "next_week", "next_month",
];

function getOperatorsForType(type: PropertyType): { value: FilterOperator; label: string }[] {
  switch (type) {
    case "number":
      return NUMBER_OPERATORS;
    case "date":
    case "created_time":
    case "last_edited_time":
      return DATE_OPERATORS;
    case "checkbox":
      return CHECKBOX_OPERATORS;
    case "select":
    case "multi_select":
    case "status":
      return SELECT_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

interface FilterBarProps {
  properties: PropertyDefinition[];
  filters: FilterRule[];
  onChange: (filters: FilterRule[]) => void;
}

export function FilterBar({ properties, filters, onChange }: FilterBarProps) {
  const [open, setOpen] = useState(false);

  const addFilter = () => {
    const firstProp = properties[0];
    if (!firstProp) return;
    const ops = getOperatorsForType(firstProp.type);
    onChange([
      ...filters,
      { id: generateId(), propertyId: firstProp.id, operator: ops[0].value, value: "" },
    ]);
    setOpen(true);
  };

  const updateFilter = (id: string, patch: Partial<FilterRule>) => {
    onChange(filters.map((f) => {
      if (f.id !== id) return f;
      const updated = { ...f, ...patch };
      // Reset operator when property changes
      if (patch.propertyId && patch.propertyId !== f.propertyId) {
        const prop = properties.find((p) => p.id === patch.propertyId);
        if (prop) {
          const ops = getOperatorsForType(prop.type);
          if (!ops.some((o) => o.value === updated.operator)) {
            updated.operator = ops[0].value;
          }
          updated.value = "";
        }
      }
      return updated;
    }));
  };

  const removeFilter = (id: string) => {
    const updated = filters.filter((f) => f.id !== id);
    onChange(updated);
    if (updated.length === 0) setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={filters.length > 0 ? "secondary" : "ghost"}
        size="sm"
        className="gap-1.5 h-7 text-xs"
        onClick={() => {
          if (filters.length === 0) addFilter();
          else if (open) {
            onChange([]);
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
      >
        <Filter className="h-3 w-3" />
        Filter
        {filters.length > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px]">
            {filters.length}
          </span>
        )}
      </Button>

      {open && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter, idx) => (
            <FilterPill
              key={filter.id}
              filter={filter}
              properties={properties}
              onUpdate={(patch) => updateFilter(filter.id, patch)}
              onRemove={() => removeFilter(filter.id)}
              showAnd={idx > 0}
            />
          ))}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={addFilter}
            className="text-muted-foreground"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

function FilterPill({
  filter,
  properties,
  onUpdate,
  onRemove,
  showAnd,
}: {
  filter: FilterRule;
  properties: PropertyDefinition[];
  onUpdate: (patch: Partial<FilterRule>) => void;
  onRemove: () => void;
  showAnd: boolean;
}) {
  const prop = properties.find((p) => p.id === filter.propertyId);
  const operators = prop ? getOperatorsForType(prop.type) : TEXT_OPERATORS;
  const needsValue = !NO_VALUE_OPERATORS.includes(filter.operator);
  const isSelectProp = prop?.type === "select" || prop?.type === "multi_select" || prop?.type === "status";
  const isCheckbox = prop?.type === "checkbox";
  const isDate = prop?.type === "date" || prop?.type === "created_time" || prop?.type === "last_edited_time";
  const isNumber = prop?.type === "number";

  return (
    <div className="flex items-center gap-1.5">
      {showAnd && (
        <span className="text-[10px] text-muted-foreground font-medium uppercase">and</span>
      )}
      <div className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 text-xs">
        <select
          value={filter.propertyId}
          onChange={(e) => onUpdate({ propertyId: e.target.value })}
          className="bg-transparent outline-none text-xs max-w-[80px]"
        >
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        <select
          value={filter.operator}
          onChange={(e) => onUpdate({ operator: e.target.value as FilterOperator })}
          className="bg-transparent outline-none text-xs text-muted-foreground"
        >
          {operators.map((op) => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>

        {needsValue && (
          isSelectProp && prop?.options ? (
            <select
              value={(filter.value as string) ?? ""}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="bg-transparent outline-none text-xs max-w-[100px]"
            >
              <option value="">Any</option>
              {prop.options.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          ) : isCheckbox ? (
            <select
              value={String(filter.value ?? "true")}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="bg-transparent outline-none text-xs"
            >
              <option value="true">Checked</option>
              <option value="false">Unchecked</option>
            </select>
          ) : isDate ? (
            <input
              type="date"
              value={(filter.value as string) ?? ""}
              onChange={(e) => onUpdate({ value: e.target.value })}
              className="bg-transparent outline-none text-xs w-28"
            />
          ) : isNumber ? (
            <input
              type="number"
              value={(filter.value as string) ?? ""}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="value"
              className="bg-transparent outline-none text-xs w-16"
            />
          ) : (
            <input
              type="text"
              value={(filter.value as string) ?? ""}
              onChange={(e) => onUpdate({ value: e.target.value })}
              placeholder="value"
              className="bg-transparent outline-none text-xs w-16"
            />
          )
        )}

        <button onClick={onRemove} className="text-muted-foreground hover:text-foreground ml-1">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
