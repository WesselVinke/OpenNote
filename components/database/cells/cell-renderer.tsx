"use client";

import type { PropertyDefinition, SelectOption } from "@/lib/types";
import { TextCell } from "./text-cell";
import { NumberCell } from "./number-cell";
import { CheckboxCell } from "./checkbox-cell";
import { DateCell } from "./date-cell";
import { SelectCell } from "./select-cell";
import { MultiSelectCell } from "./multi-select-cell";
import { StatusCell, type StatusOption } from "./status-cell";
import { TimestampCell } from "./timestamp-cell";

interface CellRendererProps {
  property: PropertyDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  onOptionsChange?: (options: SelectOption[]) => void;
}

export function CellRenderer({
  property,
  value,
  onChange,
  onOptionsChange,
}: CellRendererProps) {
  switch (property.type) {
    case "text":
    case "url":
    case "email":
    case "phone":
      return (
        <TextCell
          value={(value as string) ?? ""}
          onChange={onChange}
          type={property.type === "text" ? "text" : property.type}
        />
      );
    case "number":
      return (
        <NumberCell
          value={(value as number) ?? null}
          onChange={onChange}
        />
      );
    case "checkbox":
      return (
        <CheckboxCell
          value={!!value}
          onChange={onChange}
        />
      );
    case "date":
      return (
        <DateCell
          value={(value as string) ?? null}
          onChange={onChange}
        />
      );
    case "select":
      return (
        <SelectCell
          value={(value as string) ?? null}
          options={property.options ?? []}
          onChange={onChange}
          onOptionsChange={onOptionsChange}
        />
      );
    case "multi_select":
      return (
        <MultiSelectCell
          value={(value as string[]) ?? []}
          options={property.options ?? []}
          onChange={onChange}
          onOptionsChange={onOptionsChange}
        />
      );
    case "status":
      return (
        <StatusCell
          value={(value as string) ?? null}
          options={(property.options ?? []) as StatusOption[]}
          onChange={onChange}
          onOptionsChange={onOptionsChange as ((options: StatusOption[]) => void) | undefined}
        />
      );
    case "created_time":
    case "last_edited_time":
      return <TimestampCell value={value as string | Date | null} />;
    case "title":
      return (
        <TextCell
          value={(value as string) ?? ""}
          onChange={onChange}
        />
      );
    default:
      return (
        <TextCell
          value={String(value ?? "")}
          onChange={onChange}
        />
      );
  }
}
