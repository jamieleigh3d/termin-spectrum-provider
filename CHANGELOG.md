# Changelog

All notable changes to `termin-spectrum-provider` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial scaffold: repo metadata, Apache 2.0 license, README, contributing guide.
- Python `SpectrumProvider` class implementing `PresentationProvider` Protocol; declares all ten `presentation-base.*` contracts; `csr_bundle_url()` honors `bundle_url_override` from deploy config.
- esbuild single-bundle build pipeline targeting `termin_spectrum/static/bundle.js` (gitignored).
- JS source skeleton — entry point, B' shell renderer, theme stub, per-contract renderers (page + text functional; remaining eight as labeled placeholders).
- Python-side conformance tests (provider Protocol satisfaction, factory registration, bundle URL override).
- GitHub Actions: Python (pytest on Ubuntu+Windows) and JS (build + bundle-size budget).
