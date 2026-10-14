import type { ReactNode } from "react";
import { Msg, T, type Bi } from "./t";

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <span className="err">
      <Msg s={error} />
    </span>
  );
}

export function TextField({
  name,
  label,
  placeholder,
  error,
  max,
  optional,
  multiline,
}: {
  name: string;
  label: ReactNode;
  placeholder?: string;
  error?: string;
  max: number;
  optional?: boolean;
  /** A textarea instead of a single-line input. */
  multiline?: boolean;
}) {
  const props = {
    name,
    placeholder,
    maxLength: max,
    "aria-invalid": Boolean(error),
    required: !optional,
  };
  return (
    <label className="field">
      <span className="mono">{label}</span>
      {multiline ? <textarea {...props} /> : <input type="text" {...props} />}
      <FieldError error={error} />
    </label>
  );
}

export function ChoiceGroup({
  name,
  legend,
  options,
  error,
  optional,
}: {
  name: string;
  legend: ReactNode;
  options: [string, Bi][];
  error?: string;
  optional?: boolean;
}) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="mono mute" style={{ marginBottom: 8 }}>
        {legend}
      </legend>
      <div className="filters">
        {options.map(([value, label]) => (
          <label key={value} className="chip">
            <input
              type="radio"
              name={name}
              value={value}
              required={!optional}
            />
            <T {...label} />
          </label>
        ))}
      </div>
      <FieldError error={error} />
    </fieldset>
  );
}

export function CheckGroup({
  name,
  legend,
  options,
  error,
}: {
  name: string;
  legend: ReactNode;
  options: [string, Bi][];
  error?: string;
}) {
  return (
    <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="mono mute" style={{ marginBottom: 8 }}>
        {legend}
      </legend>
      <div className="filters">
        {options.map(([value, label]) => (
          <label key={value} className="chip">
            <input type="checkbox" name={name} value={value} />
            <T {...label} />
          </label>
        ))}
      </div>
      <FieldError error={error} />
    </fieldset>
  );
}
