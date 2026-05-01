# Changelog

All notable changes to `termin-spectrum-provider` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.1] — 2026-05-01

Reactivity + CI-correctness patch on top of v0.9.0.

### Added

- **Live row-state subscription on `data-table`.** The contract
  was render-once in v0.9.0 with a placeholder comment for
  in-place updates. JL hit the gap on the warehouse demo —
  clicking "Activate" on a draft product transitioned the state
  server-side, but the lifecycle column AND action buttons stayed
  stale until page refresh. v0.9.1 closes the placeholder:
  `data-table.tsx` is now a stateful React component that
  subscribes to `content.<source>` for created/updated/deleted
  pushes, merges the payload into local row state, and
  re-renders.
- **Client-side `__visible_actions` recompute.** v0.9.0 stamped
  this list once at bootstrap and never refreshed, so a
  `draft → active` transition left the original `["Activate"]`
  on the row. v0.9.1 recomputes per render using
  `window.__termin.state.bootstrap.transitions[source][machine]`
  + `identity.scopes` + the row's current state column. Mirrors
  the server-side `_visible_actions_for_row` helper exactly.

### Fixed

- **CI Python workflow PowerShell line-continuation.** v0.9.0
  used multi-line bash-style `\` line continuations in the pip
  install step. The Windows runner's default shell is
  PowerShell 7, whose continuation token is the backtick — the
  workflow exited 1 with `Unexpected token '\' in expression or
  statement` on every Windows matrix cell. v0.9.1 adds
  `shell: bash` to both `Install dependencies` and `Run pytest`
  steps; both runners now execute the same shell script.

### Build

- Bundle size: 925.4 KB unminified (was 924.2 KB; +1.2 KB for
  the hooks + recompute logic). Comfortably under the 1 MB
  envelope and the 250 KB gzipped budget.
- TypeScript typecheck (`tsc --noEmit`): clean.
- Python conformance: 16/16 passing.
- JS unit tests (vitest): 10/10 passing.

## [0.9.0] — 2026-04-30

Version aligned to the v0.9 Termin family release. Pre-this-release
the package versioned independently on its own SemVer track
(0.1.0.dev0); the bump to 0.9.0 makes the version story across
`termin-core`, `termin-server`, `termin-compiler`, and
`termin-spectrum-provider` legible at a glance — they all ship
together as the v0.9 family. Subsequent provider releases will
move on the family cadence.

### Changed (2026-04-30 — release-day fixes)

- **CI workflow installs the v0.9 sibling packages.** The Python
  CI job's pip command now installs `termin-core` and `termin-server`
  alongside `termin-compiler` from their respective v0.9 work
  branches. Before this change, `tests_py/` collected with
  `ModuleNotFoundError: No module named 'termin_server'` because
  the slice 7.5a migration to canonical import paths had moved the
  Protocol surface to `termin_core` and the registration helper's
  exception types to `termin_server`, neither of which the workflow
  was installing. Mirror change in `setup.py::install_requires`
  so the eventual PyPI install path resolves the same dependencies.

### Added (2026-04-29 — Phase 5+6 closure work in compiler)
- All ten `presentation-base` contracts now have real Spectrum-shaped renderers (chat is the last one — closes the v0.1.x contract surface):
  - `data-table` — TableView + TableHeader/Body + Column/Row/Cell + ActionButtonGroup; row actions filter by `__visible_actions` array attached to each row by the runtime (server-side scope + state-machine evaluation per BRD #2 §11.3).
  - `form` — Form + TextField + NumberField + Picker covering text/number/currency/enum/state/reference input types; Termin.action({kind: "create"}) submission with reload on success.
  - `chat` — TextField + Button composer (no `<form>` element to avoid 405 against the GET-only page route); subscribes to `content.<source>` for persisted-message arrival and `compute.stream.*` for streaming token deltas; pending-bubble-per-invocation pattern.
  - `markdown`, `metric`, `nav-bar`, `toast`, `banner` — lightweight HTML renderers, ~0KB bundle growth.
- `<PageChrome>` component — app header with app name + filtered nav buttons + Spectrum Picker for role switching + TextField for username entry. Driven by the new `app_chrome` block in the bootstrap payload.
- Per-component CSS injection via custom esbuild plugin — Spectrum 2's macro-bundled stylesheets reach the document; `light-dark()` color-scheme propagation from Spectrum's Provider tokens.

### Fixed (2026-04-29)
- Type-check (`tsc --noEmit`) passes — the JS workflow had been failing since the data-table commit because Spectrum 2's strict component prop types declare `children` as required, but `createElement(Comp, propsAsRecord)` doesn't satisfy that for TS. Fixed by switching the cast target from `Record<string, unknown>` to `any` for Spectrum component invocations and including `children` directly in the props object for `<PickerItem>` and `<PageChrome>` calls.

### Added (initial scaffold)
- Initial scaffold: repo metadata, Apache 2.0 license, README, contributing guide.
- Python `SpectrumProvider` class implementing `PresentationProvider` Protocol; declares all ten `presentation-base.*` contracts; `csr_bundle_url()` honors `bundle_url_override` from deploy config.
- `register_spectrum(provider_registry, contract_registry)` registers the provider against all ten contracts; auto-invoked by the Termin runtime via the `termin.providers` entry-point group declared in `setup.py`. Mirrors `register_tailwind_default` in termin-compiler — same loading path as built-ins.
- esbuild single-bundle build pipeline targeting `termin_spectrum/static/bundle.js` (gitignored).
- JS source skeleton — entry point, B' shell renderer, theme stub, per-contract renderers (page + text functional; remaining eight as labeled placeholders).
- Python-side conformance tests (provider Protocol satisfaction, factory registration, bundle URL override, registration helper) — 16 tests total.
- GitHub Actions: Python (pytest on Ubuntu+Windows) and JS (build + bundle-size budget).
