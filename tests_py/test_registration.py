# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""register_spectrum() registers all ten contracts against the runtime
ProviderRegistry. Auto-invoked at app startup via the `termin.providers`
entry point declared in setup.py."""

from __future__ import annotations

from termin_core.providers import (
    Category, ContractRegistry, ProviderRegistry,
)
from termin_core.providers.presentation_contract import (
    PRESENTATION_BASE_CONTRACTS,
)
from termin_spectrum import register_spectrum
from termin_spectrum.registration import PRODUCT_NAME


def test_register_spectrum_registers_all_ten_contracts():
    contracts = ContractRegistry.default()
    registry = ProviderRegistry()
    register_spectrum(registry, contracts)
    products = registry.list_products(
        Category.PRESENTATION, "presentation-base.text"
    )
    assert PRODUCT_NAME in products
    # All ten contracts have a spectrum binding registered.
    for short in PRESENTATION_BASE_CONTRACTS:
        full = f"presentation-base.{short}"
        record = registry.get(Category.PRESENTATION, full, PRODUCT_NAME)
        assert record is not None, f"missing registration for {full}"


def test_register_spectrum_factory_produces_provider():
    contracts = ContractRegistry.default()
    registry = ProviderRegistry()
    register_spectrum(registry, contracts)
    record = registry.get(
        Category.PRESENTATION, "presentation-base.text", PRODUCT_NAME
    )
    instance = record.factory({})
    # The instance must satisfy the Protocol the runtime checks against.
    from termin_core.providers.presentation_contract import (
        PresentationProvider,
    )
    assert isinstance(instance, PresentationProvider)


def test_register_spectrum_honors_bundle_url_override():
    """Factory passes config through; bundle URL override applied."""
    contracts = ContractRegistry.default()
    registry = ProviderRegistry()
    register_spectrum(registry, contracts)
    record = registry.get(
        Category.PRESENTATION, "presentation-base.page", PRODUCT_NAME
    )
    instance = record.factory(
        {"bundle_url_override": "https://cdn.test/bundle.js"}
    )
    assert instance.csr_bundle_url() == "https://cdn.test/bundle.js"


def test_register_spectrum_idempotent_with_pre_registered_contracts():
    """Tailwind-default may have registered the contracts already.
    register_spectrum must tolerate that and still register all ten
    provider records."""
    from termin_core.providers.presentation_contract import (
        register_presentation_base_contracts,
    )
    contracts = ContractRegistry.default()
    register_presentation_base_contracts(contracts)  # pre-register
    registry = ProviderRegistry()
    register_spectrum(registry, contracts)  # must not raise
    record = registry.get(
        Category.PRESENTATION, "presentation-base.text", PRODUCT_NAME
    )
    assert record is not None
