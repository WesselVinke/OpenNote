"use client";

interface TimestampCellProps {
  value: string | Date | null;
}

export function TimestampCell({ value }: TimestampCellProps) {
  if (!value) {
    return (
      <div className="h-full w-full px-2 py-1 text-sm flex items-center text-muted-foreground">
        &nbsp;
      </div>
    );
  }

  const date = value instanceof Date ? value : new Date(String(value));
  if (isNaN(date.getTime())) {
    return (
      <div className="h-full w-full px-2 py-1 text-sm flex items-center text-muted-foreground">
        Invalid date
      </div>
    );
  }

  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="h-full w-full px-2 py-1 text-sm flex items-center text-muted-foreground">
      {formatted}
    </div>
  );
}
