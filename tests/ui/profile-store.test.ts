// The profile and the done marks, in this browser only.
//
// This module had no tests before ADR-072, which is why its one documented
// promise - "a stale key must never crash the timeline; it must look exactly
// like no profile yet" - was false for most of Phase 6: readProfile calls
// IntakeProfile.safeParse outside any try/catch, and that call used to throw on
// a malformed birth_date. The schema is fixed; these tests are what notice if
// the promise breaks again, including through a storage that misbehaves.
//
// localStorage is stubbed rather than mocked away. The real failure modes of
// this module are a storage that refuses to write, one that throws on access,
// and a key written by an older build - none of which a mock that always works
// can show.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearProfile,
  isItemDone,
  readProfile,
  setItemDone,
  storageAvailable,
  writeProfile,
} from "@/lib/ui/profile-store";
import type { IntakeProfile } from "@/lib/schemas";

const KEY = "babysteps.profile.v1";

const PROFILE: IntakeProfile = {
  due_date: "2026-11-15",
  bundesland: "hessen",
  city: "Frankfurt am Main",
  employment_status: "employed",
  insurance: "gkv",
  nationalities: ["India", "India"],
  marital_status: "unmarried",
  first_child: true,
};

/** A localStorage that behaves, with hooks for the two ways it does not. */
function fakeStorage(options: { readThrows?: boolean; writeThrows?: boolean } = {}) {
  const map = new Map<string, string>();
  return {
    map,
    getItem(k: string) {
      if (options.readThrows) throw new Error("blocked");
      return map.get(k) ?? null;
    },
    setItem(k: string, v: string) {
      // The probe write in storage() must succeed even when a real write fails,
      // or the module would report storage unavailable instead of exercising
      // the write path this is here to test.
      if (options.writeThrows && k === KEY) throw new Error("quota");
      map.set(k, v);
    },
    removeItem(k: string) {
      map.delete(k);
    },
  };
}

function install(storage: ReturnType<typeof fakeStorage>) {
  vi.stubGlobal("window", { localStorage: storage });
  return storage;
}

let store: ReturnType<typeof fakeStorage>;

beforeEach(() => {
  store = install(fakeStorage());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the profile round-trips", () => {
  it("writes and reads back the same answers", () => {
    expect(writeProfile(PROFILE)).not.toBeNull();
    expect(readProfile()?.profile).toEqual(PROFILE);
  });

  it("starts with nothing marked done", () => {
    writeProfile(PROFILE);
    expect(readProfile()?.completed).toEqual([]);
  });

  it("keeps the anonymous id across a rewrite", () => {
    const first = writeProfile(PROFILE);
    const second = writeProfile({ ...PROFILE, city: "Offenbach" });
    expect(second?.id).toBe(first?.id);
  });

  it("refuses to store a profile the schema rejects", () => {
    expect(writeProfile({ ...PROFILE, bundesland: "bayern" } as unknown as IntakeProfile)).toBeNull();
    expect(store.map.has(KEY)).toBe(false);
  });

  it("reports storage that is not there, instead of pretending", () => {
    vi.stubGlobal("window", undefined);
    expect(storageAvailable()).toBe(false);
    expect(readProfile()).toBeNull();
    expect(writeProfile(PROFILE)).toBeNull();
  });
});

describe("birth_recorded_at is provenance for the date the parent gave us", () => {
  const BIRTH = "2026-11-09";

  it("is absent while there is no birth date", () => {
    writeProfile(PROFILE);
    expect(readProfile()?.profile.birth_recorded_at).toBeUndefined();
  });

  it("is stamped when the birth date first appears", () => {
    writeProfile(PROFILE);
    writeProfile({ ...PROFILE, birth_date: BIRTH });
    const at = readProfile()?.profile.birth_recorded_at;
    expect(at).toBeDefined();
    expect(() => new Date(at as string).toISOString()).not.toThrow();
  });

  it("does not move when the profile is rewritten with the same birth date", () => {
    writeProfile({ ...PROFILE, birth_date: BIRTH });
    const first = readProfile()?.profile.birth_recorded_at;
    writeProfile({ ...PROFILE, birth_date: BIRTH, city: "Offenbach" });
    expect(readProfile()?.profile.birth_recorded_at).toBe(first);
  });

  it("re-stamps when the birth date is corrected", () => {
    // A corrected date was recorded at the moment of the correction, not of
    // the original mistake.
    vi.setSystemTime(new Date("2026-11-10T09:00:00.000Z"));
    writeProfile({ ...PROFILE, birth_date: BIRTH });
    const first = readProfile()?.profile.birth_recorded_at;
    vi.setSystemTime(new Date("2026-11-12T09:00:00.000Z"));
    writeProfile({ ...PROFILE, birth_date: "2026-11-10" });
    const second = readProfile()?.profile.birth_recorded_at;
    expect(second).not.toBe(first);
    expect(second).toBe("2026-11-12T09:00:00.000Z");
    vi.useRealTimers();
  });

  it("is cleared with the birth date, so the pair is never half-present", () => {
    writeProfile({ ...PROFILE, birth_date: BIRTH });
    expect(readProfile()?.profile.birth_recorded_at).toBeDefined();
    writeProfile(PROFILE);
    expect(readProfile()?.profile.birth_date).toBeUndefined();
    expect(readProfile()?.profile.birth_recorded_at).toBeUndefined();
  });
});

describe("a stale or hostile key looks exactly like no profile", () => {
  it("returns null for unparseable JSON", () => {
    store.map.set(KEY, "{not json");
    expect(readProfile()).toBeNull();
  });

  it("returns null for a shape the current schema rejects", () => {
    store.map.set(KEY, JSON.stringify({ id: "x", profile: { due_date: "2026-11-15" } }));
    expect(readProfile()).toBeNull();
  });

  it("does not throw on a malformed birth date, which used to crash the screen", () => {
    // The defect this module inherited from lib/schemas.ts: safeParse raised
    // instead of returning success:false, and nothing here catches it. A key
    // written by an older build - or pasted in by hand - took the timeline down.
    store.map.set(
      KEY,
      JSON.stringify({ id: "x", profile: { ...PROFILE, birth_date: "09/11/2026" }, saved_at: "" }),
    );
    expect(() => readProfile()).not.toThrow();
    expect(readProfile()).toBeNull();
  });

  it("returns null when reading storage throws", () => {
    install(fakeStorage({ readThrows: true }));
    expect(readProfile()).toBeNull();
  });
});

describe("done marks (ADR-072)", () => {
  beforeEach(() => {
    writeProfile(PROFILE);
  });

  it("marks an item done and reads it back", () => {
    expect(setItemDone("standesamt_birth_registration", true)?.completed).toEqual([
      "standesamt_birth_registration",
    ]);
    expect(isItemDone("standesamt_birth_registration")).toBe(true);
    expect(readProfile()?.completed).toContain("standesamt_birth_registration");
  });

  it("is reversible", () => {
    setItemDone("kindergeld_application", true);
    expect(setItemDone("kindergeld_application", false)?.completed).toEqual([]);
    expect(isItemDone("kindergeld_application")).toBe(false);
  });

  it("marking twice does not duplicate the id", () => {
    setItemDone("elterngeld_application", true);
    expect(setItemDone("elterngeld_application", true)?.completed).toEqual([
      "elterngeld_application",
    ]);
  });

  it("un-marking something that was never marked is a no-op, not an error", () => {
    expect(setItemDone("hebamme_search_start", false)?.completed).toEqual([]);
  });

  it("keeps marks on other items when one is undone", () => {
    setItemDone("a", true);
    setItemDone("b", true);
    setItemDone("a", false);
    expect(setItemDone("c", true)?.completed).toEqual(["b", "c"]);
  });

  it("survives a profile rewrite — recording the birth must not un-finish a step", () => {
    setItemDone("hebamme_search_start", true);
    const after = writeProfile({ ...PROFILE, birth_date: "2026-11-09" });
    expect(after?.completed).toEqual(["hebamme_search_start"]);
    expect(isItemDone("hebamme_search_start")).toBe(true);
  });

  it("is cleared when the reader starts over", () => {
    setItemDone("hebamme_search_start", true);
    clearProfile();
    expect(readProfile()).toBeNull();
  });

  it("returns null when there is no profile to mark against", () => {
    clearProfile();
    expect(setItemDone("hebamme_search_start", true)).toBeNull();
    expect(isItemDone("hebamme_search_start")).toBe(false);
  });

  it("returns null when the write is refused, so the UI can say it was not kept", () => {
    // A checkmark that disappears on reload is worse than one that was never
    // offered: the parent would believe the product is holding something it is
    // not.
    const refusing = install(fakeStorage({ writeThrows: true }));
    refusing.map.set(
      KEY,
      JSON.stringify({ id: "x", profile: PROFILE, saved_at: "", completed: [] }),
    );
    expect(setItemDone("hebamme_search_start", true)).toBeNull();
  });

  it("ignores an id that is empty", () => {
    expect(setItemDone("", true)).toBeNull();
  });
});

describe("a completed list written by something else is read defensively", () => {
  function stored(completed: unknown) {
    store.map.set(KEY, JSON.stringify({ id: "x", profile: PROFILE, saved_at: "", completed }));
  }

  it("treats a missing list as nothing done — every pre-ADR-072 record", () => {
    store.map.set(KEY, JSON.stringify({ id: "x", profile: PROFILE, saved_at: "" }));
    expect(readProfile()?.completed).toEqual([]);
  });

  it("treats a non-array as nothing done, and keeps the profile", () => {
    for (const value of ["standesamt", 7, null, { id: true }]) {
      stored(value);
      expect(readProfile()?.completed).toEqual([]);
      expect(readProfile()?.profile).toEqual(PROFILE);
    }
  });

  it("drops entries that are not non-empty strings", () => {
    stored(["a", "", 3, null, { id: "b" }, "c"]);
    expect(readProfile()?.completed).toEqual(["a", "c"]);
  });

  it("de-duplicates", () => {
    stored(["a", "a", "b", "a"]);
    expect(readProfile()?.completed).toEqual(["a", "b"]);
  });

  it("ignores an id that matches no rule, rather than discarding the record", () => {
    // A rule that is renamed or retired leaves an orphan id behind. It must be
    // inert: the timeline simply never asks about it.
    stored(["a_rule_that_no_longer_exists"]);
    expect(readProfile()?.profile).toEqual(PROFILE);
    expect(readProfile()?.completed).toEqual(["a_rule_that_no_longer_exists"]);
  });
});
