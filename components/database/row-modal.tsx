"use client";

import type { Page } from "@prisma/client";
import type { PropertyDefinition, SelectOption } from "@/lib/types";
import { PageHeader } from "@/components/page/page-header";
import { PageEditor } from "@/components/editor/page-editor";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { CellRenderer } from "./cells/cell-renderer";

interface RowModalProps {
  open: boolean;
  onClose: () => void;
  row: Page | null;
  properties: PropertyDefinition[];
  onUpdateProperty: (rowId: string, propertyId: string, value: unknown) => void;
  onOptionsChange: (propertyId: string, options: SelectOption[]) => void;
}

export function RowModal({
  open,
  onClose,
  row,
  properties,
  onUpdateProperty,
  onOptionsChange,
}: RowModalProps) {
  if (!row) return null;

  const rawRp = row.rowProperties ?? {};
  const rowProps = (typeof rawRp === "string" ? JSON.parse(rawRp) : rawRp) as Record<string, unknown>;

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-0 flex flex-col">
        <DialogTitle className="sr-only">{row.title}</DialogTitle>
        <div className="flex-1 flex flex-col">
          <PageHeader page={row} />

          <div className="px-8 pb-6">
            <div className="space-y-3 mb-6 border-b pb-6">
              {properties
                .filter((p) => p.type !== "title")
                .map((prop) => {
                  // For timestamp properties, pass the row's createdAt/updatedAt
                  const val = prop.type === "created_time"
                    ? row.createdAt
                    : prop.type === "last_edited_time"
                    ? row.updatedAt
                    : rowProps[prop.id];

                  const isReadonly = prop.type === "created_time" || prop.type === "last_edited_time";

                  return (
                    <div key={prop.id} className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground w-32 shrink-0 truncate">
                        {prop.name}
                      </span>
                      <div className="flex-1 min-h-[32px] border rounded">
                        <CellRenderer
                          property={prop}
                          value={val}
                          onChange={(v) => {
                            if (!isReadonly) {
                              onUpdateProperty(row.id, prop.id, v);
                            }
                          }}
                          onOptionsChange={(opts) => onOptionsChange(prop.id, opts)}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>

            <PageEditor page={row} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
