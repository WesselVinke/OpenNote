"use client";

import { useState, useRef, useEffect } from "react";

interface DateCellProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function DateCell({ value, onChange }: DateCellProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  if (!editing) {
    return (
      <div
        className="h-full w-full px-2 py-1 text-sm cursor-text truncate flex items-center"
        onClick={() => setEditing(true)}
      >
        <span className="truncate">
          {value
            ? new Date(value).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "\u00A0"}
        </span>
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="date"
      value={value ? value.slice(0, 10) : ""}
      onChange={(e) => {
        onChange(e.target.value || null);
        setEditing(false);
      }}
      onBlur={() => setEditing(false)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-full w-full px-2 py-1 text-sm bg-transparent outline-none border-none ring-2 ring-ring rounded-sm"
    />
  );
}
