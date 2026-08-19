"use client";

export function CheckboxGroup({
  legend,
  name,
  options,
  values,
  onChange,
}: {
  legend: string;
  name: string;
  options: readonly string[];
  values: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <fieldset className="flex flex-wrap gap-3">
      <legend className="text-sm font-medium">{legend}</legend>
      {options.map((v) => (
        <label key={v} className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            name={name}
            value={v}
            checked={values.includes(v)}
            onChange={(e) => onChange(e.target.checked ? [...values, v] : values.filter((x) => x !== v))}
          />
          {v}
        </label>
      ))}
    </fieldset>
  );
}
