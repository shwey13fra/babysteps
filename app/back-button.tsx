// app/back-button.tsx
//
// The way back, as an arrow in the top-left corner rather than the word
// "Back" at the bottom of the page. Instructed 2026-11-18.
//
// ONE COMPONENT, THREE CALLERS. Two screens in `/intake` and one on `/` all
// need this, and the alternative to a shared component is the same inline SVG
// pasted three times, which is how two of them end up different by accident.
// CLAUDE.md rule 1 permits moving a helper to avoid duplicating it.
//
// AN ICON-ONLY CONTROL MUST STILL SAY WHAT IT IS. Nothing here is readable by
// a screen reader without `aria-label` — an unlabelled icon button is the
// anti-pattern, not the icon. The `title` is for the sighted pointer user, who
// gets no other explanation of a bare chevron. The arrow itself is
// `aria-hidden`, because it is decoration once the button is named.
//
// It is 44px square: the target floor, which an arrow glyph on its own would
// be nowhere near.

type Props = {
  onClick: () => void;
  /** What going back actually does here. Never just "Back" if more is true. */
  label: string;
};

export default function BackButton({ onClick, label }: Props) {
  return (
    <button type="button" className="back-arrow" onClick={onClick} aria-label={label} title={label}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M15 4.5 L7.5 12 L15 19.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
