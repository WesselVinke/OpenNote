"use client";

interface CheckboxCellProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function CheckboxCell({ value, onChange }: CheckboxCellProps) {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <input
        type="checkbox"
        checked={!!value}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
      />
    </div>
  );
}
