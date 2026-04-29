# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""csr_bundle_url() honors the Q3 self-hosted-default + CDN-override
contract."""

from __future__ import annotations

from termin_spectrum import spectrum_factory, SpectrumProvider
from termin_spectrum.provider import DEFAULT_BUNDLE_URL


def test_default_bundle_url_is_self_hosted():
    """Q3 default — self-hosted from runtime-served package data.
    The path is relative (starts with /) so it works against any
    origin the runtime is bound to."""
    provider = SpectrumProvider()
    assert provider.csr_bundle_url() == DEFAULT_BUNDLE_URL
    assert DEFAULT_BUNDLE_URL.startswith("/")


def test_bundle_url_override_replaces_default():
    """Q3 deploy-config override — operator points at a CDN."""
    cdn_url = "https://cdn.example.com/spectrum-1.0.0.js"
    provider = SpectrumProvider(bundle_url_override=cdn_url)
    assert provider.csr_bundle_url() == cdn_url


def test_factory_passes_override_through():
    """The factory must wire the deploy-config override into the
    provider's constructor — otherwise CDN mode is broken."""
    cdn_url = "https://cdn.example.com/spectrum.js"
    provider = spectrum_factory({"bundle_url_override": cdn_url})
    assert provider.csr_bundle_url() == cdn_url


def test_empty_string_override_falls_back_to_default():
    """Edge case: empty string is treated as 'no override' — the
    provider still serves the self-hosted default. Misconfigured
    deploy configs that set the key to an empty value should not
    break the bundle URL surface."""
    provider = SpectrumProvider(bundle_url_override="")
    assert provider.csr_bundle_url() == DEFAULT_BUNDLE_URL


def test_bundle_url_is_callable_method():
    """Per the PresentationProvider Protocol, csr_bundle_url is a
    method that returns Optional[str]. Sanity-check it's not a
    property or coroutine."""
    provider = SpectrumProvider()
    url = provider.csr_bundle_url()
    assert isinstance(url, str)
