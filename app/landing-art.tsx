// app/landing-art.tsx
//
// The drawings for the landing sequence. No state, no effects, no timing —
// only shapes. The sequence that moves them is app/landing-sequence.tsx.
//
// PROVENANCE. The motion reference is studio&more's "Bird animation PDQ" on
// Dribbble, supplied by the human. The style is followed; the artwork is ours,
// drawn from scratch in our own tokens. A style is not ownable, a commissioned
// illustration is, and this repo goes public.
//
// TWO DEPARTURES FROM docs/prototypes/landing-stork.html, both deliberate:
//
//   1. The prototype declared `--amber: #C98A14` and `--far: #241C3D`. The
//      landing spec §5 binds this build to "existing tokens only. Nothing new
//      invented." So the beak and legs are `--warn` and the far wing is
//      `--ink`, which is also what §6 of that spec says in words: "White body,
//      --in near wing, --ink far wing, amber beak and trailing legs". The
//      prototype's two hexes were the thing that disagreed with the document.
//
//   2. The prototype's eight pieces of paperwork were emoji. Emoji are not
//      flat vector in our palette — they are vendor glyphs that change shape
//      between a Pixel and an iPhone, carry their own colour, and cannot take
//      a dark-mode token. They are redrawn here as SVG, alternating `--de` and
//      `--in`, so the pile of officialdom is visibly from both jurisdictions.
//
// Every shape is stroked in its own fill with round joins, which is how the
// corners come off without a single border-radius.

/** The stork, mid-flight, carrying one baby in a cloth sling. */
export function Stork() {
  return (
    <svg className="l-bird" viewBox="0 0 320 200" aria-hidden="true" focusable="false">
      {/* trailing legs */}
      <path d="M126 96 Q96 108 62 120" stroke="var(--warn)" strokeWidth="5" fill="none" />
      <path d="M128 103 Q98 117 66 130" stroke="var(--warn)" strokeWidth="5" fill="none" />
      {/* far wing, behind the body */}
      <path
        className="l-wing-far"
        d="M160 70 Q142 26 96 22 Q128 50 138 88 Q150 92 160 70 Z"
        fill="var(--art-far)"
        stroke="var(--art-far)"
        strokeWidth="9"
      />
      {/* tail, body, neck, head */}
      <path d="M120 76 Q94 62 84 70 Q92 84 118 92 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="10" />
      <path
        d="M116 82 Q126 56 168 52 Q206 50 222 64 Q224 80 206 90 Q174 106 142 102 Q120 98 116 82 Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="10"
      />
      <path
        d="M206 62 Q226 34 246 32 Q254 40 250 52 Q230 56 220 78 Q210 76 206 62 Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="9"
      />
      <circle cx="250" cy="40" r="13" fill="#FFFFFF" />
      <circle cx="256" cy="36" r="2.2" fill="var(--ink)" />
      <path d="M261 36 Q292 40 310 44 Q292 48 261 49 Z" fill="var(--warn)" stroke="var(--warn)" strokeWidth="4" />
      {/* near wing, in front */}
      <path
        className="l-wing-near"
        d="M164 66 Q132 116 78 138 Q134 140 168 104 Q172 84 164 66 Z"
        fill="var(--in)"
        stroke="var(--in)"
        strokeWidth="10"
      />
      {/* The sling. Released at beat 2, after which the beak is empty for the
          rest of the flight. */}
      <g className="l-carry" transform="translate(6,18)">
        <g className="l-sling">
          <path
            d="M276 44 Q262 86 244 118 Q272 126 300 118 Q288 84 276 44 Z"
            fill="var(--paper)"
            stroke="var(--paper)"
            strokeWidth="8"
          />
          <path d="M276 44 Q266 86 252 118 Q258 120 262 119 Q272 84 276 44 Z" fill="#FFFFFF" />
          <Eiderdown />
        </g>
      </g>
    </svg>
  );
}

/**
 * The baby in its quilt.
 *
 * The two panels WERE `--de` and `--in` — the German track and the consular
 * track, so the baby arrived wrapped in both jurisdictions while reading as an
 * ordinary quilt to anyone who did not know. The design flagged that as the
 * author's addition rather than the human's instruction, and as the first
 * thing to cut if the picture felt too clever.
 *
 * It is cut: the landing drops the green on the human's instruction, so the
 * quilt is two purples. The symbolism is gone, the quilt remains.
 */
function Eiderdown() {
  return (
    <>
      <path
        d="M246 112 Q246 104 254 104 L272 104 Q280 104 280 112 L280 142 Q280 152 270 152
           L256 152 Q246 152 246 142 Z"
        fill="var(--in)"
        stroke="var(--in)"
        strokeWidth="6"
      />
      <path
        d="M268 104 L286 104 Q294 104 294 112 L294 142 Q294 152 284 152 L268 152 Z"
        fill="var(--art-far)"
        stroke="var(--art-far)"
        strokeWidth="6"
      />
      <path
        d="M250 112 L290 112 Q294 112 294 116 Q294 120 290 120 L250 120
           Q246 120 246 116 Q246 112 250 112 Z"
        fill="var(--in-soft)"
      />
      <circle cx="270" cy="102" r="15" fill="var(--warn-soft)" stroke="var(--warn-soft)" strokeWidth="3" />
      <circle cx="264" cy="101" r="1.9" fill="var(--ink)" />
      <circle cx="276" cy="101" r="1.9" fill="var(--ink)" />
      <path d="M265 108 Q270 112 275 108" stroke="var(--ink)" strokeWidth="1.8" fill="none" />
    </>
  );
}

/** The same bundle, falling. Seen once, from beat 3, and never again. */
export function FallingBundle() {
  return (
    <svg className="l-falling" viewBox="0 0 52 70" aria-hidden="true" focusable="false">
      <g transform="translate(-244,-85)">
        <Eiderdown />
      </g>
    </svg>
  );
}

/**
 * Eight pieces of officialdom. The accent alternates between the two tracks.
 *
 * Each is a 30×30 box so the spring keyframes can treat them identically, and
 * each is drawn only in tokens so Stage 2's dark set reaches them too.
 */
const PAPERWORK_SHAPES = [
  // 1 — a calendar
  (a: string) => (
    <>
      <rect x="4" y="7" width="22" height="19" rx="3" fill="#FFFFFF" />
      <rect x="4" y="7" width="22" height="6" rx="3" fill={a} />
      <rect x="8" y="4" width="2.6" height="5" rx="1.3" fill={a} />
      <rect x="19.4" y="4" width="2.6" height="5" rx="1.3" fill={a} />
      <circle cx="10" cy="18" r="1.7" fill={a} />
      <circle cx="15" cy="18" r="1.7" fill="var(--ink-3)" />
      <circle cx="20" cy="18" r="1.7" fill="var(--ink-3)" />
    </>
  ),
  // 2 — a letter from an office
  (a: string) => (
    <>
      <rect x="6" y="3" width="18" height="24" rx="2.5" fill="#FFFFFF" />
      <rect x="9" y="8" width="12" height="2.2" rx="1.1" fill={a} />
      <rect x="9" y="13" width="12" height="1.8" rx="0.9" fill="var(--ink-3)" />
      <rect x="9" y="17" width="12" height="1.8" rx="0.9" fill="var(--ink-3)" />
      <rect x="9" y="21" width="7" height="1.8" rx="0.9" fill="var(--ink-3)" />
    </>
  ),
  // 3 — the Amt itself
  (a: string) => (
    <>
      <path d="M15 3 L27 11 L3 11 Z" fill={a} />
      <rect x="5" y="12" width="3.4" height="11" rx="1.2" fill="#FFFFFF" />
      <rect x="13.3" y="12" width="3.4" height="11" rx="1.2" fill="#FFFFFF" />
      <rect x="21.6" y="12" width="3.4" height="11" rx="1.2" fill="#FFFFFF" />
      <rect x="3" y="24" width="24" height="3.4" rx="1.7" fill={a} />
    </>
  ),
  // 4 — a stamp
  (a: string) => (
    <>
      <circle cx="15" cy="15" r="11" fill="#FFFFFF" />
      <circle cx="15" cy="15" r="11" fill="none" stroke={a} strokeWidth="2.6" />
      <circle cx="15" cy="15" r="5.6" fill="none" stroke={a} strokeWidth="2.2" />
    </>
  ),
  // 5 — a folder
  (a: string) => (
    <>
      <path d="M3 9 Q3 6 6 6 L12 6 L14.5 9 L24 9 Q27 9 27 12 L27 23 Q27 26 24 26 L6 26 Q3 26 3 23 Z" fill={a} />
      <path d="M5 13 L25 13 Q27 13 27 16 L27 23 Q27 26 24 26 L6 26 Q3 26 3 23 L3 16 Q3 13 5 13 Z" fill="#FFFFFF" />
    </>
  ),
  // 6 — a clipboard
  (a: string) => (
    <>
      <rect x="6" y="5" width="18" height="22" rx="2.5" fill="#FFFFFF" />
      <rect x="11" y="2.5" width="8" height="5" rx="2.5" fill={a} />
      <rect x="10" y="13" width="10" height="1.9" rx="0.95" fill="var(--ink-3)" />
      <rect x="10" y="17.5" width="10" height="1.9" rx="0.95" fill="var(--ink-3)" />
      <rect x="10" y="22" width="6" height="1.9" rx="0.95" fill={a} />
    </>
  ),
  // 7 — a deadline
  (a: string) => (
    <>
      <circle cx="15" cy="16" r="11" fill="#FFFFFF" />
      <circle cx="15" cy="16" r="11" fill="none" stroke={a} strokeWidth="2.6" />
      <path d="M15 10 L15 16 L19.5 18.5" stroke={a} strokeWidth="2.4" fill="none" strokeLinecap="round" />
    </>
  ),
  // 8 — a signature
  (a: string) => (
    <>
      <path d="M7 23 L19.5 6.5 Q21 4.5 23 6 Q25 7.5 23.5 9.5 L11 26 L5.5 27 Z" fill="#FFFFFF" />
      <path d="M19.5 6.5 Q21 4.5 23 6 Q25 7.5 23.5 9.5 L20.5 13.5 L16.5 10.5 Z" fill={a} />
      <path d="M5.5 27 L11 26 L7 23 Z" fill="var(--ink)" />
    </>
  ),
] as const;

export function Paperwork({ index }: { index: number }) {
  const shape = PAPERWORK_SHAPES[index % PAPERWORK_SHAPES.length];
  // Two purples, alternating. It was --de and --in until 2026-11-18 — the
  // German track's green against the consular violet, so the pile of
  // officialdom was visibly from both jurisdictions. The human asked for the
  // landing to drop the green, and that reading went with it; --art-far is
  // the near-black-to-violet that already keeps the far wing legible in both
  // schemes, so the pile is now tonal rather than semantic.
  const accent = index % 2 === 0 ? "var(--in)" : "var(--art-far)";
  return (
    <svg viewBox="0 0 30 30" aria-hidden="true" focusable="false">
      {shape(accent)}
    </svg>
  );
}
