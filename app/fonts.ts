// app/fonts.ts
//
// IBM Plex Sans and IBM Plex Mono, self-hosted (design-system.md §3).
//
// NO REQUEST TO ANY GOOGLE DOMAIN, EVER. The .woff2 files are committed to this
// repo under app/fonts/ and next/font/local writes the @font-face rules at build
// time. A fonts.googleapis.com request is a live Abmahnung risk in Germany -
// docs/legal-compliance-pack.md is the reason, and item 7 of the Phase 6 VERIFY
// gate is a pass/fail check of the Network tab on every route.
//
// PROVENANCE. The files were extracted once from @fontsource/ibm-plex-sans and
// @fontsource/ibm-plex-mono (npm, not Google), installed with `--no-save` and
// then deleted. Neither package is a dependency, so nothing can resolve a font
// at build time. @fontsource's own CSS is discarded; next/font/local owns every
// @font-face declaration here.
//
// WHY TWO FAMILIES PER FACE. latin and latin-ext ship as separate files with
// separate unicode ranges, and next/font/local cannot set `unicode-range` on an
// individual `src` entry. Two faces of the SAME family and weight without a
// range do not fall through to one another - the CSS font-matching algorithm
// picks one face per family, and a missing glyph moves to the next FAMILY in the
// stack, not to a sibling face. So each subset is its own family and they are
// chained in `--sans` / `--mono` in globals.css. The browser only fetches the
// -ext file when a character outside latin is actually rendered, so the common
// German/English page pays nothing for it.
//
// Checked rather than assumed, from @fontsource's own CSS: the `latin` range is
// U+0000-00FF, which CONTAINS the German diacritics - Ä U+00C4, Ö U+00D6,
// Ü U+00DC, ä U+00E4, ö U+00F6, ü U+00FC, ß U+00DF. `latin-ext` is U+0100-02BA
// and up: ā, ł, ő, ș. German therefore renders from `latin` alone; latin-ext is
// carried for names a user may type, not for German.
//
// Weights are exactly the three the type scale uses - 400 body, 500 item title,
// 600 screen title - plus Mono 400 for the § reference. Nothing else: every
// extra weight is bytes on a phone in a waiting room.

import localFont from "next/font/local";

/** Body, titles and metadata. latin covers German; see the note above. */
export const plexSans = localFont({
  src: [
    { path: "./fonts/plex-sans-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-sans-latin-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plex-sans-latin-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
  // Keeps the fallback metrically close so swapping in Plex does not reflow the
  // date gutter, which is the one column where a shift would be obvious.
  adjustFontFallback: "Arial",
});

/**
 * Only fetched when a character outside U+0000-00FF is rendered.
 *
 * `preload: false` is load-bearing, not an optimisation afterthought. These
 * faces are declared in the root layout, so next/font treats them as used on
 * every route and preloads them by default - measured in the build output, that
 * put all 8 files in <link rel="preload"> and pulled 164 KB eagerly instead of
 * the 84 KB a German or English page actually needs. Latin-ext is fallback
 * coverage for a name a user might type, so it is fetched on demand or not at
 * all.
 */
export const plexSansExt = localFont({
  src: [
    { path: "./fonts/plex-sans-latin-ext-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/plex-sans-latin-ext-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/plex-sans-latin-ext-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-sans-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

/** The § reference only. An Aktenzeichen is why this is monospace at all. */
export const plexMono = localFont({
  src: [{ path: "./fonts/plex-mono-latin-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-plex-mono",
  display: "swap",
  adjustFontFallback: false,
});

/** Same reasoning as plexSansExt: coverage, not a face any page starts with. */
export const plexMonoExt = localFont({
  src: [{ path: "./fonts/plex-mono-latin-ext-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-plex-mono-ext",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

/** Every font variable, for the <html> className. */
export const fontVariables = [
  plexSans.variable,
  plexSansExt.variable,
  plexMono.variable,
  plexMonoExt.variable,
].join(" ");
