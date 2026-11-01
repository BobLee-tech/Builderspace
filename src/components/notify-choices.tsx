"use client";

import { useState } from "react";
import { T } from "@/components/t";
import {
  NOTIFY_COMMENTS,
  NOTIFY_COMMENTS_HINT,
  NOTIFY_COMMENTS_LABEL,
  NOTIFY_STARS,
  NOTIFY_STARS_HINT,
  NOTIFY_STARS_LABEL,
  type NotifyPrefs,
} from "@/lib/notify";

type Bi = { zh: string; en: string };

/**
 * The owner's two email settings as chip radios (notifyComments, notifyStars),
 * on the submit form and per project on /me. `onPick` runs after a change, for
 * forms that save right away.
 */
export function NotifyChoices({
  initial,
  onPick,
}: {
  initial: NotifyPrefs;
  onPick?: (form: HTMLFormElement | null) => void;
}) {
  const [prefs, setPrefs] = useState(initial);
  return (
    <>
      <ChoiceRow
        name="notifyComments"
        label={{ zh: "有人评论时", en: "When someone comments" }}
        values={NOTIFY_COMMENTS}
        labels={NOTIFY_COMMENTS_LABEL}
        hints={NOTIFY_COMMENTS_HINT}
        picked={prefs.comments}
        onPick={(comments, form) => {
          setPrefs((p) => ({ ...p, comments }));
          onPick?.(form);
        }}
      />
      <ChoiceRow
        name="notifyStars"
        label={{ zh: "有人 Star 时", en: "When someone stars it" }}
        values={NOTIFY_STARS}
        labels={NOTIFY_STARS_LABEL}
        hints={NOTIFY_STARS_HINT}
        picked={prefs.stars}
        onPick={(stars, form) => {
          setPrefs((p) => ({ ...p, stars }));
          onPick?.(form);
        }}
      />
    </>
  );
}

function ChoiceRow<V extends string>({
  name,
  label,
  values,
  labels,
  hints,
  picked,
  onPick,
}: {
  name: string;
  label: Bi;
  values: readonly V[];
  labels: Record<V, Bi>;
  hints: Record<V, Bi>;
  picked: V;
  onPick: (v: V, form: HTMLFormElement | null) => void;
}) {
  return (
    <fieldset className="field notify-row">
      <legend className="mono mute">
        <T {...label} />
      </legend>
      <div className="filters">
        {values.map((v) => (
          <label key={v} className="chip">
            <input
              type="radio"
              name={name}
              value={v}
              checked={picked === v}
              onChange={(e) => onPick(v, e.currentTarget.form)}
            />
            <T {...labels[v]} />
          </label>
        ))}
      </div>
      <span className="mute small">
        <T {...hints[picked]} />
      </span>
    </fieldset>
  );
}
