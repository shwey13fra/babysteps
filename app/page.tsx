import LandingSequence from "./landing-sequence";

// PRD §5, first run: "land on a single-page promise ('Every deadline. Both
// countries. In English. Sourced.') -> answer 7 intake questions (no account
// required)".
//
// Split into three screens on 2026-11-18, because one page doing the promise,
// the boundary and the entry at once was, in the human's words, "too much
// clustered and clumsy". The route is still one route: the three screens are
// client state, so Back behaves and nobody can deep-link into the middle of a
// pitch. See docs/specs/2026-11-17-landing-sequence-design.md.
//
// This file stays a Server Component. Only the sequence below it is a client
// component, which keeps the metadata and the first paint on the server where
// the under-2s load bar (PRD M1, met and measured on a real phone on mobile
// data) was earned.

export const metadata = {
  title: "BabySteps Germany — every deadline, both countries",
  description: "Every deadline. Both countries. In English. Sourced.",
};

export default function Page() {
  return <LandingSequence />;
}
