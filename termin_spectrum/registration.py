# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""register_spectrum — registers the Spectrum provider with a runtime
ProviderRegistry against all ten `presentation-base.<contract>` names.

Mirrors `register_tailwind_default` in termin-compiler. Per BRD §10
this loads through the same path built-in providers use.

Auto-invoked by the Termin runtime via the `termin.providers`
entry-point group declared in setup.py; explicit invocation is
supported but not required.
"""

from __future__ import annotations

from termin_server.providers import Category
from termin_server.providers.contracts import ContractRegistry
from termin_server.providers.presentation_contract import (
    PRESENTATION_BASE_CONTRACTS,
    register_presentation_base_contracts,
)

from termin_spectrum.factory import spectrum_factory


PRODUCT_NAME = "spectrum"


def register_spectrum(
    provider_registry, contract_registry: ContractRegistry | None = None
) -> None:
    """Register the Spectrum provider against all ten presentation-base
    contracts.

    Side effect: also registers the ten presentation-base contracts in
    the contract_registry if one is provided. Idempotent — safe to
    call multiple times if the underlying registry is the same one.
    """
    if contract_registry is not None:
        try:
            register_presentation_base_contracts(contract_registry)
        except ValueError:
            # Already registered (e.g., tailwind-default went first).
            pass

    for contract_short in PRESENTATION_BASE_CONTRACTS:
        full_name = f"presentation-base.{contract_short}"
        provider_registry.register(
            category=Category.PRESENTATION,
            contract_name=full_name,
            product_name=PRODUCT_NAME,
            factory=spectrum_factory,
            conformance="passing",
            version="0.1.0",
            contract_registry=contract_registry,
        )


__all__ = ["register_spectrum", "PRODUCT_NAME"]
