# termin-spectrum-provider

The Adobe Spectrum 2 presentation provider for [Termin](https://termin.dev).

Termin is a secure-by-construction application compiler. The runtime separates the **trust plane** (auth, confidentiality, ownership, storage) from the **presentation plane** (the React tree the user sees), and per Tenet 4 (providers over primitives) the presentation plane is open: any provider can implement the closed set of `presentation-base` contracts. This package is one such provider, built on Adobe Spectrum 2 + React Aria.

It runs in **B' mode** (server-authoritative + JS-as-renderer, LiveView-shaped) — the runtime computes component-tree IR and bound data; this provider's bundle renders. Page navigation feels SPA-fast without giving up the runtime's audit-and-confidentiality guarantees.

> **Status:** v0.9.2 — released 2026-05-05 as a repo-set alignment release with the rest of the Termin v0.9.2 family (no Spectrum surface change in v0.9.2 — the conversation-field chat hydrator landed against the Tailwind reference path only; the Spectrum chat-component implementation is on the v0.10 backlog). All ten `presentation-base` contracts (`page`, `text`, `data-table`, `form`, `chat`, `metric`, `nav-bar`, `toast`, `banner`, `markdown`) ship with Spectrum-shaped renderers from v0.9.0; v0.9.1 added live row-state subscription on `data-table`; the JS bundle is 246 KB gzipped, under the 250 KB cap.

## Install

Once published to PyPI:

```bash
pip install termin-spectrum-provider
```

For local development against an editable `termin-compiler`, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Use

Bind the provider in your Termin app's `deploy.json`:

```yaml
presentation:
  bindings:
    "presentation-base":
      provider: "spectrum"
      config: {}
  defaults:
    theme_default: "auto"
```

The runtime will resolve the binding, register `SpectrumProvider`, and serve the bundle from the package's static assets at `/_termin/providers/spectrum/bundle.js`. Override the bundle URL (e.g., to point at a CDN) with:

```yaml
bindings:
  "presentation-base":
    provider: "spectrum"
    config:
      bundle_url_override: "https://cdn.example.com/spectrum-1.0.0.js"
```

## Repository layout

```
termin-spectrum-provider/
├── termin_spectrum/             # Python package
│   ├── provider.py              # SpectrumProvider (PresentationProvider Protocol)
│   ├── factory.py               # entry-point factory for runtime registration
│   └── static/
│       └── bundle.js            # built JS bundle (built in CI; gitignored)
├── src/                         # JS source
│   ├── index.tsx                # entry point — registers __app_shell__
│   ├── shell.tsx                # B' shell renderer
│   ├── theme.tsx                # Spectrum theme + HC override layer
│   ├── contracts/               # one renderer per presentation-base contract
│   └── glue/                    # runtime ↔ provider bridge helpers
├── tests_py/                    # Python-side conformance
├── tests/                       # JS-side unit tests
└── esbuild.config.mjs           # single-bundle build (~150KB gzipped target)
```

## Locked design decisions

The provider's architecture follows the five questions JL locked on 2026-04-28 (see `docs/spectrum-provider-design.md` in the [termin-compiler](https://github.com/jamieleigh3d/termin-compiler) repo):

| | Decision |
|---|---|
| **Q1 (build pipeline)** | Per-provider package — this repo. termin-compiler stays Python-only. |
| **Q2 (architecture)** | B' = server-authoritative + JS-as-renderer (LiveView-shaped). |
| **Q3 (bundle hosting)** | Self-hosted by default + deploy-config CDN override. |
| **Q4 (theme)** | Spectrum light/dark/auto + explicit HC token override layer. |
| **Q5 (bundle composition)** | Single all-in-one bundle. esbuild, IIFE, ~150KB gzipped target. |
| **Q-extra (action API)** | Client-side dispatch in `termin.js` — no `/_termin/action` server endpoint. |

## License

Apache 2.0 — see [LICENSE](LICENSE) and [NOTICE](NOTICE).

## Related

- [termin-compiler](https://github.com/jamieleigh3d/termin-compiler) — the compiler and reference runtime.
- [termin-conformance](https://github.com/jamieleigh3d/termin-conformance) — the runtime conformance suite.
- [termin.dev](https://termin.dev) — project website.
