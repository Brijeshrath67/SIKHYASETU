// Minimal flat ESLint config. The frontend's type safety is enforced by
// `tsc -b` (see scripts/ci/lint-frontend.sh); ESLint is optional and, when
// installed, picks up this config for consistent syntax checks.
export default [
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {},
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
