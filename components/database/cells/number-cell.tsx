"use client";

import { useState, useRef, useEffect } from "react";

interface NumberCellProps {
  value: number | null;
  onChange: (value: number | null) => void;
}

export function NumberCell({ value, onChange }: NumberCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value?.toString() ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value?.toString() ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const num = draft === "" ? null : Number(draft);
    if (num !== value && (num === null || !isNaN(num))) {
      onChange(num);
    }
  };

  if (!editing) {
    return (
      <div
        className="h-full w-full px-2 py-1 text-sm cursor-text truncate flex items-center"
        onClick={() => setEditing(true)}
      >
        <span className="truncate">{value != null ? value : "\u00A0"}</span>
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="number"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value?.toString() ?? "");
          setEditing(false);
        }
      }}
      className="h-full w-full px-2 py-1 text-sm bg-transparent outline-none border-none ring-2 ring-ring rounded-sm"
    />
  );
}
