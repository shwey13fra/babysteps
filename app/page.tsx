import Link from "next/link";

// PRD §5, first run: "land on a single-page promise ('Every deadline. Both
// countries. In English. Sourced.') -> answer 7 intake questions (no account
// required)".
//
// Voice is design-system.md §7: sentence case, buttons name their effect, and
// the interface never sounds relieved or worried on the user's behalf. No
// "Don't worry", no exclamation marks, no claim that this is easy.

export const metadata = {
  title: "BabySteps Germany — every deadline, both countries",
  description: "Every deadline. Both countries. In English. Sourced.",
};

export default function Page() {
  return (
    <>
      <div className="head">
        <div className="state">BabySteps Germany</div>
        <div className="sub">Hessen and Berlin · German offices and the Indian consulate</div>
      </div>

      <div className="pad">
        <h1 className="title">Every deadline. Both countries. In English. Sourced.</h1>

        <p className="lede">
          Having a baby in Germany sets off two calendars at once: the German offices, and your
          consulate. Both run on dates nobody tells you, and the dates move when the baby arrives
          early.
        </p>

        <p className="lede">
          Answer seven questions and you get the dates that apply to you, each one showing what it
          is counted from and which official source it comes from.
        </p>

        <Link className="btn-primary" href="/intake" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
          Answer the seven questions
        </Link>

        <p className="meta" style={{ marginTop: "18px" }}>
          No account, no e-mail. Your answers stay on this phone. Takes about two minutes.
        </p>

        <h2 className="sub-title">What this is not</h2>
        <p className="lede">
          It does not fill in forms, contact an office for you, or tell you what you are entitled
          to. It tells you the rule, the date, and who decides — and then you go to them.
        </p>
      </div>
    </>
  );
}
