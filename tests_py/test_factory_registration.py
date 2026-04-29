# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""spectrum_factory(config) returns a provider instance and honors
deploy-config keys."""

from __future__ import annotations

from termin_spectrum import spectrum_factory, SpectrumProvider


def test_factory_returns_spectrum_provider():
    """The factory's return value is a SpectrumProvider instance."""
    provider = spectrum_factory({})
    assert isinstance(provider, SpectrumProvider)


def test_factory_handles_empty_config():
    """Empty config is valid — the provider falls back to the
    self-hosted default bundle URL (Q3)."""
    provider = spectrum_factory({})
    url = provider.csr_bundle_url()
    assert url and url.startswith("/")  # self-hosted, runtime-served


def test_factory_ignores_unknown_config_keys():
    """Forward-compat: unknown keys are silently ignored. Strict
    config validation belongs in the runtime's binding resolver,
    not in the provider factory."""
    provider = spectrum_factory({
        "bundle_url_override": None,
        "future_unknown_key": "value",
        "another_one": 42,
    })
    assert isinstance(provider, SpectrumProvider)
