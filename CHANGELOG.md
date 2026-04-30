# Changelog

All notable changes to `termin-spectrum-provider` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
