"use client";

// The "make a link for your partner" control.
//
// The link is minted on the server because the signing secret lives there. What
// comes back is a token; the URL is assembled here so the host is whatever the
// person is actually using, rather than something we have to configure.
//
// The link is deliberately NOT generated on page load. It is a capability to
// read this profile, so it exists only once someone has asked for it.

import { useState } from "react";
import { readProfile } from "@/lib/ui/profile-store";

type State =
  | { phase: "idle" }
  | { phase: "working" }
  | { phase: "ready"; url: string; copied: boolean }
  | { phase: "unavailable" }
  | { phase: "failed" };

export function ShareLink() {
  const [state, setState] = useState<State>({ phase: "idle" });

  async function make() {
    const stored = readProfile();
    if (!stored) return;
    setState({ phase: "working" });
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stored.profile),
        cache: "no-store",
      });
      if (res.status === 503) return setState({ phase: "unavailable" });
      if (!res.ok) return setState({ phase: "failed" });
      const body = await res.json();
      if (typeof body.token !== "string") return setState({ phase: "failed" });
      setState({
        phase: "ready",
        url: `${window.location.origin}/share/${body.token}`,
        copied: false,
      });
    } catch {
      setState({ phase: "failed" });
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setState({ phase: "ready", url, copied: true });
    } catch {
      // Clipboard access can be refused; the field is selectable either way.
      setState({ phase: "ready", url, copied: false });
    }
  }

  if (state.phase === "ready") {
    return (
      <div className="banner">
        <b>A read-only link for your partner</b>
        <span>
          Anyone with this link can see these dates. It does not let them change anything, and it
          does not update — make a new one after the birth.
        </span>
        <label className="field" style={{ marginTop: "10px", marginBottom: "8px" }}>
          <span>Share link</span>
          <input type="text" readOnly value={state.url} onFocus={(e) => e.target.select()} />
        </label>
        <button type="button" className="btn-ghost" onClick={() => void copy(state.url)}>
          {state.copied ? "Copied" : "Copy the link"}
        </button>
      </div>
    );
  }

  if (state.phase === "unavailable") {
    return (
      <p className="meta">Sharing is not switched on in this deployment.</p>
    );
  }

  if (state.phase === "failed") {
    return <p className="meta">The link could not be made just now. Please try again.</p>;
  }

  return (
    <button
      type="button"
      className="btn-ghost"
      style={{ width: "100%" }}
      onClick={() => void make()}
      disabled={state.phase === "working"}
    >
      {state.phase === "working" ? "Making a link…" : "Make a link for your partner"}
    </button>
  );
}
