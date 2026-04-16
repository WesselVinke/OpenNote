"use client";

import { useState, useRef, useEffect } from "react";
import type { PropertyDefinition, PropertyType } from "@/lib/types";
import { generateId } from "@/lib/utils/id";
import { Button } from "@/components/ui/button";
import { Plus, Type, Hash, Calendar, CheckSquare, Link, Mail, Phone, List, Tag, Clock, CircleDot } from "lucide-react";
import { DEFAULT_STATUS_OPTIONS } from "@/lib/utils/constants";

const PROPERTY_TYPES: { type: PropertyType; label: string; icon: React.ReactNode; group: string }[] = [
  { type: "text", label: "Text", icon: <Type className="h-4 w-4" />, group: "Basic" },
  { type: "number", label: "Number", icon: <Hash className="h-4 w-4" />, group: "Basic" },
  { type: "select", label: "Select", icon: <List className="h-4 w-4" />, group: "Basic" },
  { type: "multi_select", label: "Multi-select", icon: <Tag className="h-4 w-4" />, group: "Basic" },
  { type: "status", label: "Status", icon: <CircleDot className="h-4 w-4" />, group: "Basic" },
  { type: "date", label: "Date", icon: <Calendar className="h-4 w-4" />, group: "Basic" },
  { type: "checkbox", label: "Checkbox", icon: <CheckSquare className="h-4 w-4" />, group: "Basic" },
  { type: "url", label: "URL", icon: <Link className="h-4 w-4" />, group: "Basic" },
  { type: "email", label: "Email", icon: <Mail className="h-4 w-4" />, group: "Basic" },
  { type: "phone", label: "Phone", icon: <Phone className="h-4 w-4" />, group: "Basic" },
  { type: "created_time", label: "Created time", icon: <Clock className="h-4 w-4" />, group: "Advanced" },
  { type: "last_edited_time", label: "Last edited time", icon: <Clock className="h-4 w-4" />, group: "Advanced" },
];

export { PROPERTY_TYPES };

interface AddPropertyProps {
  onAdd: (property: PropertyDefinition) => void;
}

export function AddProperty({ onAdd }: AddPropertyProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"name" | "type">("name");
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setStep("name");
        setName("");
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open && step === "name") inputRef.current?.focus();
  }, [open, step]);

  const handleSelectType = (type: PropertyType) => {
    onAdd({
      id: generateId(),
      name: name || (type === "status" ? "Status" : "Property"),
      type,
      options: type === "status"
        ? [...DEFAULT_STATUS_OPTIONS]
        : type === "select" || type === "multi_select"
        ? []
        : undefined,
      width: 150,
    });
    setOpen(false);
    setStep("name");
    setName("");
    setSearch("");
  };

  const filtered = PROPERTY_TYPES.filter(
    (p) => !search || p.label.toLowerCase().includes(search.toLowerCase())
  );
  const groups = [...new Set(filtered.map((p) => p.group))];

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setOpen(!open)}
        className="text-muted-foreground"
      >
        <Plus className="h-4 w-4" />
      </Button>

      {open && (
        <div className="absolute top-full right-0 z-50 mt-1 w-56 rounded-md border bg-popover p-2 shadow-md">
          {step === "name" ? (
            <>
              <p className="text-xs text-muted-foreground mb-2">Property name</p>
              <input
                ref={inputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setStep("type");
                }}
                placeholder="Enter name..."
                className="w-full px-2 py-1 text-sm bg-transparent outline-none border border-border rounded mb-2"
              />
              <Button
                size="sm"
                className="w-full"
                onClick={() => setStep("type")}
              >
                Next
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">Property type</p>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search types..."
                className="w-full px-2 py-1 text-sm bg-transparent outline-none border border-border rounded mb-2"
                autoFocus
              />
              <div className="max-h-60 overflow-y-auto space-y-2">
                {groups.map((group) => (
                  <div key={group}>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 mb-0.5">
                      {group}
                    </p>
                    {filtered
                      .filter((p) => p.group === group)
                      .map(({ type, label, icon }) => (
                        <button
                          key={type}
                          className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent"
                          onClick={() => handleSelectType(type)}
                        >
                          {icon}
                          {label}
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
