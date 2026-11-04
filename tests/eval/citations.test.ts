// Citation validity and fabrication (ADR-049).
//
// House rule: a checker that cannot fail is not a check. Every invariant here
// is driven by something known broken. The Kinder-RL case below is the real
// defect — A-17 scored 0/3 on three consecutive runs with three correct,
// on-topic citations, because the lookup was keyed on source_url alone and the
// Kinder-RL PDF holds 72 sections behind one URL.

import { describe, expect, it } from "vitest";
import {
  normalizeRef,
  normalizeUrl,
  refsIn,
  resolveCitedChunk,
  scoreCitations,
  type ScorableChunk,
} from "@/scripts/eval/citations";

const KINDER_URL = "https://www.g-ba.de/downloads/62-492-3998/Kinder-RL_2025-05-15_iK-2026-01-01.pdf";

/** The three chunks A-17 actually cites, verbatim openings from data/cache/chunks.json. */
const kinderShown: ScorableChunk[] = [
  {
    section_ref: "Kinder-RL §1",
    source_url: KINDER_URL,
    content: "Kinder-RL §1 — Grundlagen\n\n(1) Kinder haben bis zur Vollendung des 18. Lebensjahres Anspruch…",
  },
  {
    section_ref: "Kinder-RL §2",
    source_url: KINDER_URL,
    content:
      "Kinder-RL §2 — Allgemeines zu den Untersuchungen, Zeiträume und Toleranzgrenzen\n\nUntersuchung Zeitraum Toleranzgrenze U1…",
  },
  {
    section_ref: "Kinder-RL §3",
    source_url: KINDER_URL,
    content: "Kinder-RL §3 — U1\n\n(1) Die U1 soll unmittelbar innerhalb der ersten 30 Minuten…",
  },
];

const cite = (ref: string, url = KINDER_URL) => ({ section_ref: ref, source_url: url });

describe("the defect this module exists for", () => {
  it("scores all three Kinder-RL citations valid although they share one URL", () => {
    const s = scoreCitations(
      [cite("Kinder-RL §1"), cite("Kinder-RL §2"), cite("Kinder-RL §3")],
      kinderShown,
    );
    // Under url-only keying this was 0/3 or 1/3 by luck of which chunk the map kept.
    expect(s.total).toBe(3);
    expect(s.valid).toBe(3);
    expect(s.fabricated).toEqual([]);
  });

  it("resolves each citation to its OWN chunk, not the last one at that URL", () => {
    expect(resolveCitedChunk(cite("Kinder-RL §2"), kinderShown)?.section_ref).toBe("Kinder-RL §2");
    // §3 is last in the list: the url-only map returned it for every citation.
    expect(resolveCitedChunk(cite("Kinder-RL §1"), kinderShown)?.section_ref).toBe("Kinder-RL §1");
  });

  it("does not confuse §1 with §17 at the same URL", () => {
    const shown: ScorableChunk[] = [
      { section_ref: "Kinder-RL §17", source_url: KINDER_URL, content: "Kinder-RL §17 — Zielkrankheiten…" },
    ];
    expect(resolveCitedChunk(cite("Kinder-RL §1"), shown)).toBeNull();
    expect(scoreCitations([cite("Kinder-RL §1")], shown).valid).toBe(0);
  });
});

describe("validity can still fail", () => {
  it("fails a chunk whose text does not contain the § it is labelled with", () => {
    const shown: ScorableChunk[] = [
      { section_ref: "BEEG §7", source_url: "https://x/beeg/__7.html", content: "Anspruch auf Elterngeld hat, wer…" },
    ];
    const s = scoreCitations([cite("BEEG §7", "https://x/beeg/__7.html")], shown);
    expect(s.total).toBe(1);
    expect(s.valid).toBe(0);
    // It was shown, so it is not fabricated — only unvalidated.
    expect(s.fabricated).toEqual([]);
  });

  it("fails a citation to a ref shown only at a different URL", () => {
    const shown: ScorableChunk[] = [
      { section_ref: "BEEG §7", source_url: "https://x/beeg/__7.html", content: "BEEG §7 — Anspruch…" },
    ];
    const s = scoreCitations([cite("BEEG §7", "https://elsewhere.example/page")], shown);
    expect(s.valid).toBe(0);
    // Ref-keyed, so citing the right law from the wrong page is NOT fabrication.
    expect(s.fabricated).toEqual([]);
  });

  it("counts nothing valid when nothing was shown", () => {
    const s = scoreCitations([cite("Kinder-RL §2")], []);
    expect(s).toEqual({ total: 1, valid: 0, guidance: 0, fabricated: ["Kinder-RL §2"] });
  });
});

describe("fabrication", () => {
  it("flags a ref that appears nowhere in what the model was shown", () => {
    const s = scoreCitations([cite("Kinder-RL §99")], kinderShown);
    expect(s.total).toBe(1);
    expect(s.valid).toBe(0);
    expect(s.fabricated).toEqual(["Kinder-RL §99"]);
  });

  it("does not flag a ref that was shown but cited from the wrong url", () => {
    const s = scoreCitations([cite("Kinder-RL §1", "https://other.example/doc.pdf")], kinderShown);
    expect(s.fabricated).toEqual([]);
    expect(s.valid).toBe(0);
  });
});

describe("guidance citations leave the denominator", () => {
  it("counts a doc_title citation as guidance, not as an invalid §", () => {
    const s = scoreCitations(
      [
        { section_ref: "Familienportal: Anmeldung Ihres Kindes beim Standesamt", source_url: "https://fp/x" },
        cite("Kinder-RL §2"),
      ],
      kinderShown,
    );
    expect(s.guidance).toBe(1);
    expect(s.total).toBe(1);
    expect(s.valid).toBe(1);
  });

  it("treats a null section_ref as guidance rather than throwing", () => {
    const s = scoreCitations([{ section_ref: null, source_url: "https://fp/x" }], kinderShown);
    expect(s).toEqual({ total: 0, valid: 0, guidance: 1, fabricated: [] });
  });
});

describe("the normalisers move unchanged", () => {
  it("upper-cases the prefix and keeps a lettered section", () => {
    expect(normalizeRef("bkgg §6a")).toBe("BKGG §6a");
    expect(normalizeRef("SGB V §24d")).toBe("SGB V §24d");
  });

  it("returns null for a doc title carrying no §", () => {
    expect(normalizeRef("Was Sie zum Elterngeld wissen müssen")).toBeNull();
  });

  it("strips scheme and trailing slash", () => {
    expect(normalizeUrl("HTTPS://Example.com/a/")).toBe("example.com/a");
  });

  it("reads every ref in a ground-truth cell, primary first", () => {
    expect(refsIn("PStG §18 + PStV §33 and Hessen guidance")).toEqual(["PSTG §18", "PSTV §33"]);
  });
});
