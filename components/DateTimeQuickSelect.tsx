"use client";

import type { DateTimeValue } from "./DateTime24Field";

export function DateTimeQuickSelect({
  options,
  onSelect,
}: {
  options: { label: string; value: DateTimeValue }[];
  onSelect: (value: DateTimeValue) => void;
}) {
  const available = options.filter((o) => o.value.date && o.value.time);
  if (available.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {available.map((o) => (
        <button
          key={o.label}
          type="button"
          onClick={() => onSelect(o.value)}
          className="rounded border border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-100"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
