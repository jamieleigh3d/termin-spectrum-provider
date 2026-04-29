# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""SpectrumProvider satisfies the PresentationProvider Protocol.

This is the cross-package contract test — the Termin runtime expects
any registered provider to pass `isinstance(provider, PresentationProvider)`
at startup (the Protocol is `@runtime_checkable`). This test fails if
the Protocol surface drifts and we miss the signal.
"""

from __future__ import annotations

import pytest

from termin_runtime.providers.presentation_contract import (
    PRESENTATION_BASE_CONTRACTS,
    PresentationProvider,
)
from termin_spectrum import SpectrumProvider


def test_spectrum_provider_satisfies_protocol():
    """Runtime-checkable Protocol — isinstance must return True."""
    provider = SpectrumProvider()
    assert isinstance(provider, PresentationProvider)


def test_spectrum_provider_declares_all_ten_base_contracts():
    """v0.1.0 declares all ten presentation-base contracts so the
    runtime's deploy-time validation is satisfied even when most
    contracts are still labeled-placeholder renderers in the JS
    bundle. Real renderers fill in over subsequent slices."""
    provider = SpectrumProvider()
    declared = set(provider.declared_contracts)
    expected = {f"presentation-base.{name}" for name in PRESENTATION_BASE_CONTRACTS}
    assert declared == expected, (
        f"Missing: {expected - declared}; Extra: {declared - expected}"
    )


def test_spectrum_provider_declares_csr_only():
    """Q5 + Q-extra: Spectrum is a CSR-only provider. Operators
    needing SSR fallback bind a different provider (e.g.,
    tailwind-default) for SSR contracts."""
    provider = SpectrumProvider()
    assert provider.render_modes == ("csr",)


def test_render_ssr_raises_not_implemented():
    """Calling render_ssr on a CSR-only provider is a deployment
    misconfiguration — caller bound Spectrum to a contract that
    requires SSR. Fail loud, not silent."""
    provider = SpectrumProvider()
    with pytest.raises(NotImplementedError):
        provider.render_ssr(
            contract="presentation-base.text",
            ir_fragment={},
            data=None,
            principal_context=None,
        )
