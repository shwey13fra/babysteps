// The partner share token.
//
// This is the only signed artefact in the product, so the tests are about what
// a holder of a link can and cannot do with it. Every assertion here describes
// an attack or a mistake, not a happy path.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { IntakeProfile } from "@/lib/schemas";
import { createShareToken, sharingConfigured, verifyShareToken } from "@/lib/share/token";

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

const SECRET = "test-secret-not-a-real-one";
const ISSUED = "2026-11-06T10:00:00.000Z";

let saved: string | undefined;

beforeEach(() => {
  saved = process.env.SHARE_LINK_HMAC_SECRET;
  process.env.SHARE_LINK_HMAC_SECRET = SECRET;
});

afterEach(() => {
  if (saved === undefined) delete process.env.SHARE_LINK_HMAC_SECRET;
  else process.env.SHARE_LINK_HMAC_SECRET = saved;
});

describe("a token round-trips", () => {
  it("verifies and returns the profile unchanged", () => {
    const token = createShareToken(PROFILE, ISSUED);
    expect(token).not.toBeNull();
    const result = verifyShareToken(token!);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.profile).toEqual(PROFILE);
      expect(result.payload.issued_at).toBe(ISSUED);
      expect(result.payload.v).toBe(1);
    }
  });

  it("carries a recorded birth date through", () => {
    const withBirth = { ...PROFILE, birth_date: "2026-11-02" };
    const token = createShareToken(withBirth, ISSUED)!;
    const result = verifyShareToken(token);
    if (result.ok) expect(result.payload.profile.birth_date).toBe("2026-11-02");
  });

  it("is URL-safe, so it survives being pasted into a link", () => {
    const token = createShareToken(PROFILE, ISSUED)!;
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(encodeURIComponent(token)).toBe(token);
  });
});

describe("the link is signed, not encrypted — and that is deliberate", () => {
  it("the profile inside is readable by whoever holds the link", () => {
    // Asserted so nobody later builds on an assumption of secrecy. The person
    // holding the link is the partner it was made for; what the signature buys
    // is that they cannot ALTER it.
    const token = createShareToken(PROFILE, ISSUED)!;
    const decoded = JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
    expect(decoded.profile.city).toBe("Frankfurt am Main");
  });
});

describe("a holder cannot alter what the link says", () => {
  it("rejects an edited payload", () => {
    const token = createShareToken(PROFILE, ISSUED)!;
    const [body, sig] = token.split(".");
    const edited = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    edited.profile.due_date = "2027-06-01";
    const forged = `${Buffer.from(JSON.stringify(edited)).toString("base64url")}.${sig}`;
    expect(verifyShareToken(forged)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects an edited Bundesland", () => {
    const token = createShareToken(PROFILE, ISSUED)!;
    const [body, sig] = token.split(".");
    const edited = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    edited.profile.bundesland = "berlin";
    const forged = `${Buffer.from(JSON.stringify(edited)).toString("base64url")}.${sig}`;
    expect(verifyShareToken(forged).ok).toBe(false);
  });

  it("rejects a tampered signature", () => {
    const token = createShareToken(PROFILE, ISSUED)!;
    const [body, sig] = token.split(".");
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    expect(verifyShareToken(`${body}.${flipped}`)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a signature of the wrong length without throwing", () => {
    // timingSafeEqual throws on a length mismatch; the lengths are compared
    // first so a short signature is a verdict, not a crash.
    const token = createShareToken(PROFILE, ISSUED)!;
    const [body] = token.split(".");
    expect(() => verifyShareToken(`${body}.short`)).not.toThrow();
    expect(verifyShareToken(`${body}.short`)).toEqual({ ok: false, reason: "bad_signature" });
  });

  it("rejects a token signed with a different secret", () => {
    const token = createShareToken(PROFILE, ISSUED)!;
    process.env.SHARE_LINK_HMAC_SECRET = "a-different-secret";
    expect(verifyShareToken(token)).toEqual({ ok: false, reason: "bad_signature" });
  });
});

describe("malformed and out-of-version tokens", () => {
  it.each([["empty", ""], ["no dot", "abcdef"], ["too many parts", "a.b.c"], ["empty body", ".sig"], ["empty sig", "body."]])(
    "rejects %s",
    (_label, token) => {
      expect(verifyShareToken(token).ok).toBe(false);
    },
  );

  it("refuses a version it does not know, rather than guessing at the fields", () => {
    const payload = { v: 2, profile: PROFILE, issued_at: ISSUED };
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
    expect(verifyShareToken(`${body}.${sig}`)).toEqual({ ok: false, reason: "wrong_version" });
  });

  it("refuses a correctly signed token whose profile no longer parses", () => {
    // A signature proves we issued the bytes. It does not prove they still fit
    // the schema, and a token minted before a schema change must be refused
    // rather than handed to the engine.
    const payload = { v: 1, profile: { ...PROFILE, bundesland: "bayern" }, issued_at: ISSUED };
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
    expect(verifyShareToken(`${body}.${sig}`)).toEqual({ ok: false, reason: "bad_profile" });
  });

  it("does not throw on a signed payload with a malformed date", () => {
    // IntakeProfile.safeParse can THROW on a non-ISO date, and this input is
    // attacker-influenced, so the parse is wrapped.
    const payload = { v: 1, profile: { ...PROFILE, birth_date: "09/11/2026" }, issued_at: ISSUED };
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const { createHmac } = require("node:crypto") as typeof import("node:crypto");
    const sig = createHmac("sha256", SECRET).update(body).digest("base64url");
    expect(() => verifyShareToken(`${body}.${sig}`)).not.toThrow();
    expect(verifyShareToken(`${body}.${sig}`)).toEqual({ ok: false, reason: "bad_profile" });
  });
});

describe("with no secret configured", () => {
  beforeEach(() => {
    delete process.env.SHARE_LINK_HMAC_SECRET;
  });

  it("reports that sharing is not configured", () => {
    expect(sharingConfigured()).toBe(false);
  });

  it("never mints an unsigned token", () => {
    expect(createShareToken(PROFILE, ISSUED)).toBeNull();
  });

  it("refuses to verify anything", () => {
    expect(verifyShareToken("anything.atall")).toEqual({ ok: false, reason: "no_secret" });
  });

  it("treats an empty secret as no secret", () => {
    process.env.SHARE_LINK_HMAC_SECRET = "";
    expect(sharingConfigured()).toBe(false);
    expect(createShareToken(PROFILE, ISSUED)).toBeNull();
  });
});
