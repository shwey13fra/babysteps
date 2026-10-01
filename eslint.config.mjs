// eslint-config-next's default export is a flat-config ARRAY, not a factory.
// Spread it; calling it throws "next is not a function".
//
// Pins worth knowing about: eslint is held at 9.x because eslint-config-next
// bundles eslint-plugin-react 7.37.5, which supports eslint ^9.7 and crashes on
// 10 (getFilename was removed). typescript is held at 6.x because
// typescript-eslint 8.x refuses TS 7. Both pins are upstream constraints, not
// preferences.
import next from "eslint-config-next";

const config = [
  ...next,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "data/raw/**",
      "data/cache/**",
      "next-env.d.ts",
    ],
  },
];

export default config;
