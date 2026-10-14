import type { ReactNode } from "react";
import { Msg, T, type Bi } from "./t";

export function TextField({
  name,
  label,
  placeholder,
  error,
  max,
}: {
  name: string;
  label: ReactNode;
  placeholder?: string;
  error?: string;
  max: number;
}) {
  return (
    <label className="field">
      <span className="mono">{label}</span>
      <input
        type="text"
        name={name}
        placeholder={placeholder}
        maxLength={max}
        aria-invalid={Boolean(error)}
        required
      />
      {error && (
        <span className="err">
          <Msg s={error} />
        </span>
      )}
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
      {error && (
        <span className="err">
          <Msg s={error} />
        </span>
      )}
    </fieldset>
  );
}

export function CheckGroup({
  name,
  legend,
  options,
}: {
  name: string;
  legend: ReactNode;
  options: [string, Bi][];
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
    </fieldset>
  );
}
