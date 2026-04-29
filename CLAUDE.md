# termin-spectrum-provider — Claude Context

This file is for Claude Code sessions working in this repository. Universal norms (who JL is, git discipline, environment quirks) live in `~/.claude/CLAUDE.md` and load automatically. Termin-family working style (TDD, three test levels, PEG authority) lives in `E:\ClaudeWorkspace\CLAUDE.md`. This file holds the repo-specific context only.

## What this is

The Adobe Spectrum 2 presentation provider for Termin. Hybrid Python + Node project. The Python side registers against `termin_runtime.providers.presentation_contract.PresentationProvider`; the Node side builds a single ~150KB-gzipped bundle that runs the B' (LiveView-shaped) shell. See [termin-compiler/docs/spectrum-provider-design.md](https://github.com/jamieleigh3d/termin-compiler/blob/main/docs/spectrum-provider-design.md) for the architectural decisions.

## Layout

- `termin_spectrum/` — Python package. `provider.py` is the `SpectrumProvider` class; `factory.py` is the entry-point factory the Termin runtime calls at app startup; `static/bundle.js` is the built JS (gitignored — built in CI).
- `src/` — TypeScript / TSX source. `index.tsx` is the entry point; it calls `Termin.registerRenderer("__app_shell__", ...)` plus per-contract renderers. `shell.tsx` walks a component-tree IR and dispatches per `node.contract`. `contracts/` holds one renderer per `presentation-base.*` contract; `glue/` holds the runtime↔provider bridge.
- `tests_py/` — Python-side conformance (pytest).
- `tests/` — JS unit tests (vitest).

## Working style

- **Python tests must pass without `npm install`.** The Python conformance verifies Protocol satisfaction, factory registration, bundle URL override — none of that needs the bundle to exist. CI builds the bundle separately.
- **The bundle is not committed.** `termin_spectrum/static/bundle.js` is gitignored. CI rebuilds on every PR; release tags ship the wheel with the bundle baked in as package data.
- **Editable installs** for cross-repo dev. From the activated venv: `pip install -e ../termin-compiler` then `pip install -e .`. No git submodules, no path-discovery code.
- **Public repo discipline.** This repo is public. No JL-personal references in commits, no employer-internal context, no naming of work-context AI collaborators. Claude (this collaborator) attribution via the standard `Co-Authored-By: Claude Anthropic <noreply@anthropic.com>` trailer is fine when JL approves a commit.

## Locked decisions (don't relitigate)

- **Per-provider package** (Q1, JL-locked 2026-04-28). This repo exists because termin-compiler stays Python-only.
- **B' architecture** (Q2). The runtime is authoritative for trust plane; this provider owns the React tree.
- **Self-hosted bundle + deploy-config CDN override** (Q3). `csr_bundle_url()` reads `bundle_url_override` from provider config, falls back to `/_termin/providers/spectrum/bundle.js`.
- **Theme** (Q4). Spectrum light/dark/auto via `prefers-color-scheme`; HC = augmented dark + explicit token override layer.
- **Single all-in-one bundle** (Q5). esbuild IIFE, no externals, ~150KB gzipped target.
- **Action API** (Q-extra). `Termin.action(payload)` dispatches client-side from `termin.js`. No new server endpoint.

## v0.1.0 scope

Smallest end-to-end loop: skeleton + Python provider class + JS shell + working build pipeline + `page` and `text` renderers. The other eight contracts get labeled-placeholder renderers so a hello-world example renders without crashing.

Subsequent slices fill in `data-table`, `form`, `markdown`, `chat`, `metric`, `nav-bar`, `toast`, `banner` — likely one or two per commit, ordered by what unblocks compiling-side examples (warehouse / helpdesk / projectboard).

## What lives elsewhere

- **Contract Protocols** — in `termin-compiler/termin_runtime/providers/presentation_contract.py`. Don't redefine here.
- **`PresentationData`, `PrincipalContext`, `Redacted`** — same place. Imported, not re-implemented.
- **`Termin.registerRenderer`, `Termin.action`, `Termin.subscribe`** — implemented in `termin-compiler/termin_runtime/static/termin.js`. This bundle calls them; doesn't redefine them.
- **Conformance fixtures + IR schema** — in `termin-conformance`.

## Common commands

```bash
# Python tests
pytest tests_py/ -v

# JS build (one-shot)
npm run build

# JS build (watch)
npm run watch

# JS tests
npm test

# Verify Python provider satisfies the Protocol
python -c "from termin_spectrum import SpectrumProvider; \
           from termin_runtime.providers.presentation_contract import PresentationProvider; \
           assert isinstance(SpectrumProvider(), PresentationProvider)"
```
