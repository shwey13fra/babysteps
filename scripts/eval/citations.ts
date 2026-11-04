// Citation scoring for the eval harness: reference normalisation, validity,
// and fabrication. Pure — no I/O, no model calls — so it can be tested, which
// `run.ts` cannot be: `main()` runs at import.
//
// WHY THIS MODULE EXISTS (2026-11-04, ADR-049)
//
// Validity used to resolve a citation back to its chunk through a map keyed on
// source_url ALONE (`run.ts:734`, `new Map(hits.map(h => [url, h]))`, which
// keeps the LAST chunk per URL). Measured over `data/cache/chunks.json`:
//
//   - exactly ONE source URL in the corpus carries more than one section_ref —
//     the Kinder-RL PDF, with 72. Every other source is one § per URL.
//   - 250 of 250 statute chunks contain their own section number in `content`,
//     because the chunker prepends the ref ("BKGG §9 — Antrag\n\n(1) …").
//
// So the content test passed trivially wherever the lookup resolved correctly,
// and on the one multi-§ source it collapsed 72 sections into a single chunk:
// at most one citation of any set could pass. A-17 cites Kinder-RL §1, §2 and
// §3 — all correct, all on-topic — and scored 0/3 in three consecutive runs,
// which was the entire citation-validity gap against the Phase 5 gate.
//
// The fix is the keying, nothing else: resolve by (url, ref). The honest
// consequence, recorded rather than buried, is that this measure has little
// discriminating power left once the lookup is right — the real guard against
// a mis-cited § is `fabricated`, which was keyed by ref and correct all along.
// Giving the check teeth (validating against the source document rather than
// the chunker's prefix) is a separate, larger change and is NOT done here.

// ---------------------------------------------------------------------------
// Reference and URL normalisation — moved here from run.ts with its history
// ---------------------------------------------------------------------------

/**
 * 'BEEG §7(1)' and 'BEEG § 7' both normalise to 'BEEG §7'. The golden set
 * names sub-paragraphs; chunk section_refs stop at the §. Comparing them raw
 * would score every statutory row a miss.
 */
// A statute prefix may be several words ("SGB V", "SGB VIII", "SGB X") or
// hyphenated ("Kinder-RL"). The original pattern was a single word of 2+
// letters, which silently mis-read every one of those:
//
//   SGB V §24d   -> null          invisible to every ref comparison
//   SGB X §64    -> null          same
//   SGB VIII §59 -> "VIII §59"   prefix dropped
//   Kinder-RL §2  -> "RL §2"     prefix dropped
//
// `null` was the damaging case. The citation loop treats an unparseable ref as
// a GUIDANCE citation and `continue`s on the reasoning that it "claims no §" —
// so SGB V and SGB X citations were dropped from the validity denominator AND
// skipped the fabricated-reference check, which raises a critical. A
// hallucinated `SGB V §27b` could not be caught. Measured on the 2026-11-03
// baseline: 5 statute citations counted as guidance (SGB V §24i x2, §24d x2,
// §10 x1), so citation validity reported a denominator of 51 where 56 was due.
//
// The two truncating cases matched each other on both sides of every
// comparison, so they worked by accident rather than by design. Roman-numeral
// continuation only, deliberately: every ref_prefix in corpus_manifest.yaml is
// covered by it, and allowing any capital letter would let the pattern swallow
// the first letter of a following word.
const REF_PATTERN = /([A-Za-zÄÖÜäöüß][A-Za-zÄÖÜäöüß-]{1,}(?:\s+[IVXL]+)?)\s*§+\s*(\d+[a-z]?)/;

export function normalizeRef(ref: string): string | null {
  const m = ref.match(REF_PATTERN);
  return m ? `${m[1].toUpperCase()} §${m[2]}` : null;
}

/** Every § reference in a ground-truth cell, in order. First is the primary. */
export function refsIn(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(REF_PATTERN.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) out.push(`${m[1].toUpperCase()} §${m[2]}`);
  return out;
}

export function normalizeUrl(url: string): string {
  return url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

/** The citation fields this scoring reads. A subset of the Citation contract. */
export type CitedRef = {
  section_ref: string | null;
  source_url: string;
};

/** The chunk fields this scoring reads. A subset of ChunkHit. */
export type ScorableChunk = {
  section_ref: string | null;
  source_url: string;
  content: string;
};

export type CitationScore = {
  /** Citations claiming a §. The validity denominator. */
  total: number;
  valid: number;
  /**
   * Citations carrying a doc_title in section_ref instead of a §, because the
   * Citation contract forbids null there (generate.ts:108). They claim no §,
   * so there is nothing to validate and counting them would drag validity
   * down for a claim the answer never made. Counted separately rather than
   * dropped, so the denominator stays auditable.
   */
  guidance: number;
  /** Cited refs that appear nowhere in what the model was shown. */
  fabricated: string[];
};

/**
 * Resolves a citation to the chunk it was cited FROM, by url AND ref.
 *
 * Keyed on both because one source URL in the corpus holds 72 sections; keying
 * on url alone silently returns a different § and fails a correct citation.
 * Returns null when nothing shown matches, which scores invalid.
 */
export function resolveCitedChunk<T extends ScorableChunk>(
  citation: CitedRef,
  shown: readonly T[],
): T | null {
  const norm = citation.section_ref ? normalizeRef(citation.section_ref) : null;
  if (!norm) return null;
  const url = normalizeUrl(citation.source_url);
  return (
    shown.find(
      (h) =>
        normalizeUrl(h.source_url) === url &&
        h.section_ref !== null &&
        normalizeRef(h.section_ref) === norm,
    ) ?? null
  );
}

/**
 * Validity and fabrication over one row's citations.
 *
 * `shown` is what the model was handed — the retrieval hits, not the wider
 * ranked list — because a citation is valid relative to the text the answer
 * was written from.
 */
export function scoreCitations(
  citations: readonly CitedRef[],
  shown: readonly ScorableChunk[],
): CitationScore {
  const shownRefs = new Set(
    shown
      .map((h) => (h.section_ref ? normalizeRef(h.section_ref) : null))
      .filter((r): r is string => Boolean(r)),
  );

  const score: CitationScore = { total: 0, valid: 0, guidance: 0, fabricated: [] };

  for (const c of citations) {
    const norm = c.section_ref ? normalizeRef(c.section_ref) : null;
    if (!norm) {
      score.guidance++;
      continue;
    }
    score.total++;

    const chunk = resolveCitedChunk(c, shown);
    const number = norm.split("§")[1]?.trim();
    // The cited chunk must itself contain the § it is cited for. Near-tautological
    // once the lookup is keyed correctly (see the header): kept because it still
    // fails a chunk whose text genuinely lacks the §, and because replacing it
    // is a different change.
    if (chunk && number && new RegExp(`§+\\s*${escapeRe(number)}\\b`).test(chunk.content)) {
      score.valid++;
    }

    // Fabrication is ref-keyed and was always correct: a ref the model never
    // saw, at any URL. Deliberately NOT narrowed to the cited URL — that would
    // conflate citing the right law from the wrong page with inventing it.
    if (!shownRefs.has(norm)) score.fabricated.push(c.section_ref ?? norm);
  }

  return score;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
