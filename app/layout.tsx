import type { ReactNode } from "react";

// Phase 1 shell only. Fonts (self-hosted IBM Plex, never from a Google domain),
// design tokens and the permanent disclaimer footer are Phase 6 / Phase 7.
export const metadata = {
  title: "BabySteps Germany",
  description: "Every deadline. Both countries. In English. Sourced.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
