"use client";

import { useState, useRef, useEffect } from "react";

interface TextCellProps {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "url" | "email" | "phone";
}

export function TextCell({ value, onChange, type = "text" }: TextCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== (value ?? "")) onChange(draft);
  };

  if (!editing) {
    const isLink = type === "url" && draft;
    return (
      <div
        className="h-full w-full px-2 py-1 text-sm cursor-text truncate flex items-center"
        onClick={() => setEditing(true)}
      >
        {isLink ? (
          <a
            href={draft}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline truncate"
            onClick={(e) => e.stopPropagation()}
          >
            {draft}
          </a>
        ) : (
          <span className="truncate">{draft || "\u00A0"}</span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type === "url" ? "url" : type === "email" ? "email" : "text"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setDraft(value ?? "");
          setEditing(false);
        }
      }}
      className="h-full w-full px-2 py-1 text-sm bg-transparent outline-none border-none ring-2 ring-ring rounded-sm"
    />
  );
}
