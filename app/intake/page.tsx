"use client";

// app/intake/page.tsx
//
// Seven questions, one per screen, no account (FR1, PRD §5). Under two minutes
// is the target, which is why every question that can be a single tap is one:
// five of the seven advance on tap, with no separate "next" press.
//
// The profile is written to localStorage under an anonymous UUID and nothing is
// sent anywhere. The dates are worked out afterwards by POST /api/timeline.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { todayISO } from "@/lib/timeline/dates";
import { writeProfile, storageAvailable } from "@/lib/ui/profile-store";
import { QUESTIONS, TOTAL, dotLit, toProfile, validate, type Draft } from "./questions";

export default function IntakePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({});
  const [error, setError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  // One clock read for the whole flow, so validation cannot change under the
  // user if they leave the tab open across midnight.
  const today = useMemo(() => todayISO(), []);
  const canStore = useMemo(() => storageAvailable(), []);

  const atReview = step === TOTAL;
  const question = atReview ? null : QUESTIONS[step];

  function advance(next: Draft) {
    setDraft(next);
    setError(null);
    setStep((s) => s + 1);
  }

  function onContinue() {
    if (!question) return;
    const problem = validate(question.key, draft, today);
    if (problem) {
      setError(problem);
      return;
    }
    advance(draft);
  }

  function onBack() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  function onFinish() {
    const profile = toProfile(draft);
    if (!profile) {
      // Should be unreachable: every screen validates before advancing. If it
      // happens, say so rather than writing a half-profile.
      setError("Something is missing. Step back through the questions and check.");
      return;
    }
    const stored = writeProfile(profile);
    if (!stored) {
      setSaveFailed(true);
      return;
    }
    router.push("/timeline");
  }

  return (
    <>
      <div className="dots" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL} aria-valuenow={Math.min(step + 1, TOTAL)} aria-label={`Question ${Math.min(step + 1, TOTAL)} of ${TOTAL}`}>
        {QUESTIONS.map((q, i) => (
          <i key={q.key} className={dotLit(i, step) ? "on" : ""} />
        ))}
      </div>

      <div className="pad">
        {question ? (
          <>
            <p className="meta" style={{ marginTop: "14px" }}>
              Question {step + 1} of {TOTAL}
            </p>
            <h1 className="title">{question.title}</h1>
            <p className="lede">{question.lede}</p>

            {question.kind === "choice" ? (
              <>
                {question.choices?.map((choice) => (
                  <button
                    key={choice.label}
                    type="button"
                    className="choice"
                    aria-pressed={false}
                    onClick={() => advance({ ...draft, ...choice.value })}
                  >
                    <b>{choice.label}</b>
                    {choice.note ? <em>{choice.note}</em> : null}
                  </button>
                ))}
                {error ? <span className="field err">{error}</span> : null}
              </>
            ) : (
              <>
                <label className="field">
                  <span>{question.fieldLabel}</span>
                  <input
                    type={question.kind === "date" ? "date" : "text"}
                    inputMode={question.kind === "text" ? "text" : undefined}
                    placeholder={question.placeholder}
                    value={(draft[question.key] as string | undefined) ?? ""}
                    onChange={(e) => {
                      setError(null);
                      setDraft({ ...draft, [question.key]: e.target.value });
                    }}
                    aria-invalid={error !== null}
                    aria-describedby={error ? "intake-error" : undefined}
                  />
                  {error ? (
                    <span className="err" id="intake-error">
                      {error}
                    </span>
                  ) : null}
                </label>
                <button type="button" className="btn-primary" onClick={onContinue}>
                  Continue
                </button>
              </>
            )}

            <div className="nav">
              {step > 0 ? (
                <button type="button" className="back" onClick={onBack}>
                  Back
                </button>
              ) : null}
            </div>

            <p className="meta" style={{ marginTop: "18px" }}>
              No account, no e-mail. Your answers stay on this phone.
            </p>
          </>
        ) : (
          <>
            <p className="meta" style={{ marginTop: "14px" }}>
              That is all seven
            </p>
            <h1 className="title">Ready to work out your dates</h1>
            <p className="lede">
              We will work out every deadline from these answers. Nothing is sent anywhere — the
              dates are calculated and handed straight back to this phone.
            </p>

            <p className="lede">
              One thing to be straight about: we cover{" "}
              <span lang="de" className="term">
                gesetzliche Krankenversicherung
              </span>{" "}
              <span className="gloss">(statutory health insurance)</span> only. If you are privately
              insured, the medical and insurance steps here will not match your situation, and we
              would rather say so than show you dates that do not apply.{" "}
              <Link href="/how-it-works">What we cover</Link>
            </p>

            {saveFailed ? (
              <div className="aside" role="alert" style={{ margin: "0 0 16px" }}>
                <b>This browser will not let us save your answers.</b>
                <p style={{ margin: 0 }}>
                  That usually means private browsing, or site data is blocked. The timeline needs
                  the answers saved on this device, so it cannot be drawn without it.
                </p>
              </div>
            ) : null}

            {canStore ? null : (
              <div className="aside" style={{ margin: "0 0 16px" }}>
                <b>This browser is not keeping site data.</b>
                <p style={{ margin: 0 }}>
                  Your answers cannot be saved on this device, so the timeline will not be able to
                  draw. Leaving private browsing fixes it.
                </p>
              </div>
            )}

            {error ? <span className="field err">{error}</span> : null}

            <button type="button" className="btn-primary" onClick={onFinish}>
              Show my timeline
            </button>

            <div className="nav">
              <button type="button" className="back" onClick={onBack}>
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
