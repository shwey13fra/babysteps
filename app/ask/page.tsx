"use client";

// app/ask/page.tsx — the Q&A panel and thread (item 6).
//
// Renders ONLY from the Answer contract. The response is validated against the
// zod union before anything is drawn, and an 'answered' reply with no citations
// draws nothing at all (rule 8) - the citation is the reason an answer here is
// believable, so an uncited one is a failure, not a degraded success.
//
// The wait is a skeleton reading "Checking the official sources", not streaming.
// design-system.md §5: "nothing renders without a validated citation, and
// streaming means rendering unvalidated text. A three-second honest wait that
// ends in a cited answer is better than a fast wait that ends in a retraction."

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Answer } from "@/lib/schemas";
import type { IntakeProfile } from "@/lib/schemas";
import { readProfile } from "@/lib/ui/profile-store";
import {
  PANEL_ERRORS,
  WAIT_TEXT,
  toAnswerView,
  toChip,
  type AnswerView,
  type PanelError,
} from "@/lib/ui/answer-view";

/** 8 000 characters is the cap /api/ask enforces; stop well before it. */
const MAX_CHARS = 2000;

type Entry = {
  id: number;
  question: string;
  state:
    | { phase: "waiting" }
    | { phase: "answered"; view: AnswerView }
    | { phase: "failed"; error: PanelError }
    | { phase: "maintenance"; message: string };
};

function SourceChip({ citation }: { citation: Parameters<typeof toChip>[0] }) {
  const chip = toChip(citation);
  return (
    <a className="src" href={chip.href} target="_blank" rel="noreferrer noopener">
      <code>{chip.ref}</code>
      <em>{chip.asOf}</em>
    </a>
  );
}

function Reply({ view }: { view: AnswerView }) {
  if (view.treatment === "aside") {
    // No colour, no red, no icon. §5: a medical deflection styled in red would
    // make an anxious person feel they had done something wrong.
    return (
      <div className="aside">
        <b>{view.heading}</b>
        {view.text.split("\n\n").map((para, i) => (
          <p key={i} style={i === view.text.split("\n\n").length - 1 ? { margin: 0 } : undefined}>
            {para}
          </p>
        ))}
      </div>
    );
  }

  return (
    <div className="answer">
      {view.text.split("\n\n").map((para, i) => (
        <p key={i}>{para}</p>
      ))}
      <div>
        {view.citations.map((c) => (
          <SourceChip key={`${c.section_ref}-${c.source_url}`} citation={c} />
        ))}
      </div>
      <div className="scope">{view.scope}</div>
      <div className="scope">{view.disclaimer}</div>
    </div>
  );
}

export default function AskPage() {
  const [profile, setProfile] = useState<IntakeProfile | null>(null);
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<Entry[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = readProfile();
      if (!cancelled && stored) setProfile(stored.profile);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function settle(id: number, state: Entry["state"]) {
    setThread((t) => t.map((e) => (e.id === id ? { ...e, state } : e)));
    setBusy(false);
  }

  async function onAsk() {
    const text = question.trim();
    if (!text || !profile || busy) return;
    if (text.length > MAX_CHARS) {
      const id = nextId.current++;
      setThread((t) => [...t, { id, question: text.slice(0, 120), state: { phase: "waiting" } }]);
      settle(id, { phase: "failed", error: "too_long" });
      return;
    }

    const id = nextId.current++;
    setThread((t) => [...t, { id, question: text, state: { phase: "waiting" } }]);
    setQuestion("");
    setBusy(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, profile }),
        cache: "no-store",
      });

      if (res.status === 429) return settle(id, { phase: "failed", error: "rate_limited" });
      if (res.status === 503) {
        const body = await res.json().catch(() => ({}));
        return settle(id, {
          phase: "maintenance",
          message: typeof body.message === "string" ? body.message : PANEL_ERRORS.server,
        });
      }
      if (!res.ok) return settle(id, { phase: "failed", error: "server" });

      // Validated against the contract before anything is drawn.
      const parsed = Answer.safeParse(await res.json());
      if (!parsed.success) return settle(id, { phase: "failed", error: "server" });

      const view = toAnswerView(parsed.data);
      // Rule 8: an 'answered' reply with no citation is a failure, not an
      // answer. Nothing is rendered from it.
      if (!view) return settle(id, { phase: "failed", error: "server" });

      settle(id, { phase: "answered", view });
    } catch {
      settle(id, { phase: "failed", error: "offline" });
    }
  }

  return (
    <>
      <div className="head">
        <div className="state">Ask a question</div>
        <div className="sub">Answers come only from official sources</div>
      </div>

      <div className="pad">
        {thread.length === 0 ? (
          <>
            <h1 className="title">What would you like to know?</h1>
            <p className="lede">
              We answer from the German family laws, the Hessen and Berlin offices, and the Indian
              consulate — and we say so when a question is outside that.{" "}
              <Link href="/how-it-works">What we cover</Link>
            </p>
          </>
        ) : null}

        {thread.map((entry) => (
          <div className="qa" key={entry.id}>
            <div className="question">{entry.question}</div>

            {entry.state.phase === "waiting" ? (
              <div className="skeleton" aria-live="polite" style={{ margin: 0 }}>
                <i />
                <i />
                <i />
                <p>{WAIT_TEXT}</p>
              </div>
            ) : null}

            {entry.state.phase === "answered" ? <Reply view={entry.state.view} /> : null}

            {entry.state.phase === "maintenance" ? (
              <div className="aside">
                <b>Questions are paused for a moment.</b>
                <p style={{ margin: 0 }}>{entry.state.message}</p>
              </div>
            ) : null}

            {entry.state.phase === "failed" ? (
              <div className="aside">
                <b>We did not answer that one.</b>
                <p style={{ margin: 0 }}>{PANEL_ERRORS[entry.state.error]}</p>
              </div>
            ) : null}
          </div>
        ))}

        {profile === null ? (
          <p className="lede">
            <Link href="/intake">Answer the seven questions</Link> first — answers are scoped to
            your state and your situation, so we need them to answer accurately.
          </p>
        ) : (
          <>
            <label className="field" style={{ marginTop: thread.length ? "18px" : 0 }}>
              <span>Your question</span>
              <input
                type="text"
                value={question}
                maxLength={MAX_CHARS}
                placeholder="How long after the birth can we apply for Elterngeld?"
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void onAsk();
                }}
              />
            </label>
            <button
              type="button"
              className="btn-primary"
              onClick={() => void onAsk()}
              disabled={busy || question.trim().length === 0}
            >
              {busy ? WAIT_TEXT : "Ask"}
            </button>
          </>
        )}

        <p className="meta" style={{ marginTop: "18px" }}>
          We never say what you are entitled to or what an office will decide. We state the rule and
          name who decides. <Link href="/timeline">Back to the timeline</Link>
        </p>
      </div>
    </>
  );
}
