import type { ReactNode } from "react";
import { Msg, T, type Bi } from "./t";

/** The id a field's inputs point `aria-describedby` at for its error. */
export const errorId = (name: string) => `${name}-error`;

export function FieldError({ name, error }: { name: string; error?: string }) {
  if (!error) return null;
  return (
    <span className="err" id={errorId(name)}>
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
  url,
  email,
}: {
  name: string;
  label: ReactNode;
  placeholder?: string;
  error?: string;
  max: number;
  optional?: boolean;
  /** A textarea instead of a single-line input. */
  multiline?: boolean;
  /** A link: brings up the URL keyboard on phones. Kept `type="text"` so
   * bare `github.com/…` still submits and is completed server-side. */
  url?: boolean;
  /** An email address: email keyboard on phones and browser autofill. */
  email?: boolean;
}) {
  const props = {
    name,
    placeholder,
    maxLength: max,
    "aria-invalid": Boolean(error),
    "aria-describedby": error ? errorId(name) : undefined,
    required: !optional,
  };
  return (
    <label className="field">
      <span className="mono">{label}</span>
      {multiline ? (
        <textarea {...props} />
      ) : (
        <input
          type={email ? "email" : "text"}
          inputMode={url ? "url" : undefined}
          autoComplete={email ? "email" : undefined}
          {...props}
        />
      )}
      <FieldError name={name} error={error} />
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
              aria-describedby={error ? errorId(name) : undefined}
            />
            <T {...label} />
          </label>
        ))}
      </div>
      <FieldError name={name} error={error} />
    </fieldset>
  );
}

export function CheckGroup({
  name,
  legend,
  options,
  error,
  invalid = Boolean(error),
}: {
  name: string;
  legend: ReactNode;
  options: [string, Bi][];
  error?: string;
  /** Set when the error for `name` is shown outside this group. */
  invalid?: boolean;
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
              type="checkbox"
              name={name}
              value={value}
              aria-invalid={invalid}
              aria-describedby={invalid ? errorId(name) : undefined}
            />
            <T {...label} />
          </label>
        ))}
      </div>
      <FieldError name={name} error={error} />
    </fieldset>
  );
}
