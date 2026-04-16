"use client";

import { useState, useRef, useEffect } from "react";
import type { PropertyDefinition, PropertyType } from "@/lib/types";
import { PropertyIcon } from "./property-icon";
import { PROPERTY_TYPES } from "./add-property";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Settings2, GripVertical, ChevronDown } from "lucide-react";

interface PropertiesPanelProps {
  properties: PropertyDefinition[];
  visibleProperties: string[];
  onToggleVisibility: (propertyId: string) => void;
  onShowAll: () => void;
  onHideAll: () => void;
  onChangePropertyType?: (propertyId: string, newType: PropertyType) => void;
}

export function PropertiesPanel({
  properties,
  visibleProperties,
  onToggleVisibility,
  onShowAll,
  onHideAll,
  onChangePropertyType,
}: PropertiesPanelProps) {
  const [open, setOpen] = useState(false);
  const [changingType, setChangingType] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setChangingType(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const nonTitleProps = properties.filter((p) => p.type !== "title");
  const hasHidden = visibleProperties.length > 0 && nonTitleProps.some((p) => !visibleProperties.includes(p.id));

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant={hasHidden ? "secondary" : "ghost"}
        size="sm"
        className="gap-1.5 h-7 text-xs"
        onClick={() => { setOpen(!open); setChangingType(null); }}
      >
        <Settings2 className="h-3 w-3" />
        Properties
        {hasHidden && (
          <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[10px]">
            {nonTitleProps.filter((p) => !visibleProperties.includes(p.id)).length} hidden
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-64 rounded-md border bg-popover shadow-md">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-xs font-medium text-muted-foreground">Properties</span>
            <div className="flex items-center gap-1">
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent"
                onClick={onShowAll}
              >
                Show all
              </button>
              <button
                className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-accent"
                onClick={onHideAll}
              >
                Hide all
              </button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-1">
            {nonTitleProps.map((prop) => {
              const isVisible = visibleProperties.length === 0 || visibleProperties.includes(prop.id);
              return (
                <div key={prop.id} className="group">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-accent text-sm">
                    <GripVertical className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-50 cursor-grab shrink-0" />
                    <PropertyIcon type={prop.type} className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate text-xs">{prop.name}</span>

                    {onChangePropertyType && (
                      <button
                        className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground hover:text-foreground px-1 rounded"
                        onClick={() => setChangingType(changingType === prop.id ? null : prop.id)}
                        title="Change type"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    )}

                    <button
                      className="shrink-0"
                      onClick={() => onToggleVisibility(prop.id)}
                    >
                      {isVisible ? (
                        <Eye className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {changingType === prop.id && onChangePropertyType && (
                    <div className="ml-6 mr-2 mb-1 border rounded bg-background p-1 max-h-40 overflow-y-auto">
                      {PROPERTY_TYPES.filter((pt) => pt.type !== prop.type && pt.type !== "created_time" && pt.type !== "last_edited_time").map((pt) => (
                        <button
                          key={pt.type}
                          className="flex w-full items-center gap-2 px-2 py-1 text-xs rounded hover:bg-accent"
                          onClick={() => {
                            onChangePropertyType(prop.id, pt.type);
                            setChangingType(null);
                          }}
                        >
                          {pt.icon}
                          <span>{pt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
