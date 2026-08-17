"use client";

const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function DateTime24Field({
  label,
  fieldName,
  date,
  time,
  onDateChange,
  onTimeChange,
  required,
}: {
  label: string;
  fieldName: string;
  date: string;
  time: string;
  onDateChange: (value: string) => void;
  onTimeChange: (value: string) => void;
  required?: boolean;
}) {
  const [hour, minute] = time ? time.split(":") : ["", ""];

  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <div className="flex items-center gap-2">
        <input
          type="date"
          required={required}
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
          className="rounded border border-slate-300 px-2 py-1"
        />
        <select
          required={required}
          value={hour}
          onChange={(e) => onTimeChange(`${e.target.value}:${minute || "00"}`)}
          className="rounded border border-slate-300 px-2 py-1"
        >
          <option value="">HH</option>
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span>:</span>
        <select
          required={required}
          value={minute}
          onChange={(e) => onTimeChange(`${hour || "00"}:${e.target.value}`)}
          className="rounded border border-slate-300 px-2 py-1"
        >
          <option value="">MM</option>
          {minutes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <input type="hidden" name={fieldName} value={date && time ? `${date}T${time}:00` : ""} />
    </label>
  );
}
