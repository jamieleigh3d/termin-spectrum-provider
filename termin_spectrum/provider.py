# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""SpectrumProvider — implements PresentationProvider for Adobe Spectrum 2.

CSR-only. The runtime resolves the binding at deploy, asks the provider
for `csr_bundle_url()` to learn where to fetch the JS, and serves the
bundle at that URL. The bundle's `index.tsx` calls
`Termin.registerRenderer("__app_shell__", ...)` plus per-contract
renderers; from then on the runtime delegates rendering to the bundle
via the bootstrap-payload + page-data API.

This Python class doesn't render anything itself — `render_ssr` raises.
Spectrum is CSR-only; if a deployment needs SSR fallback, bind a
different provider for that namespace or per-contract.
"""

from __future__ import annotations

from typing import Any, Mapping, Optional

# These types are defined in termin-compiler. Importing here ties this
# package to the Protocol; runtime checks (isinstance) verify it.
from termin_server.providers.presentation_contract import (
    PRESENTATION_BASE_CONTRACTS,
    PresentationData,
    PrincipalContext,
)


# Default bundle URL — the runtime serves this from package data via
# its presentation-bundle endpoint surface. Operators override via
# config.bundle_url_override (e.g., to point at a CDN).
DEFAULT_BUNDLE_URL = "/_termin/providers/spectrum/bundle.js"


class SpectrumProvider:
    """Adobe Spectrum 2 presentation provider.

    Declares all ten `presentation-base.*` contracts. Render mode is
    CSR-only — the bundle's renderers handle the visible surface;
    SSR is not supported by this provider.

    Constructor args:
        bundle_url_override: optional URL string. When set, replaces
            the default self-hosted bundle URL (Q3 deploy-config CDN
            override mechanism).
    """

    declared_contracts: tuple[str, ...] = tuple(
        f"presentation-base.{name}" for name in PRESENTATION_BASE_CONTRACTS
    )
    render_modes: tuple[str, ...] = ("csr",)

    def __init__(self, bundle_url_override: Optional[str] = None) -> None:
        self._bundle_url = bundle_url_override or DEFAULT_BUNDLE_URL

    def render_ssr(
        self,
        contract: str,
        ir_fragment: Any,
        data: PresentationData,
        principal_context: PrincipalContext,
    ) -> str:
        raise NotImplementedError(
            "SpectrumProvider is CSR-only. Bind a different provider "
            "for SSR contracts, or use Tailwind-default for SSR fallback."
        )

    def csr_bundle_url(self) -> Optional[str]:
        return self._bundle_url


__all__ = ["SpectrumProvider", "DEFAULT_BUNDLE_URL"]
