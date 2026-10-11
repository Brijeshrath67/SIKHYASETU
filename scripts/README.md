# Scripts

Small, dependency-light helpers. Run them from anywhere; each resolves the repo
root itself.

```
environment/   install the toolchain and set up dev/test
ci/            the checks CI runs
release/       produce build artifacts
ops/           operational tasks (pack validation, audio retention)
```

## Common commands

```sh
scripts/environment/setup-dev.sh      # install backend + frontend deps
scripts/ci/test-backend.sh            # pytest
scripts/ci/test-frontend.sh           # vitest
scripts/ci/lint-backend.sh            # compile check (+ ruff if present)
scripts/ci/lint-frontend.sh           # tsc typecheck
scripts/ci/validate-contracts.sh      # JSON + pack integrity
scripts/release/build-frontend.sh     # vite production build
```

The backend uses the interpreter in `$PYTHON` (default `python3`); the frontend
uses `npm`.
