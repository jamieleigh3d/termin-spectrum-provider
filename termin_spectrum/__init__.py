# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""termin-spectrum-provider — Adobe Spectrum 2 presentation provider for Termin.

This package implements the `PresentationProvider` Protocol (defined in
`termin_runtime.providers.presentation_contract`) using Adobe Spectrum 2
+ React Aria as the renderer library. It runs in B' mode (server-
authoritative + JS-as-renderer / LiveView-shaped) per the Q2 design
decision.

Public surface:

    SpectrumProvider — the provider class.
    spectrum_factory — the factory function the runtime calls at deploy
        time; constructs a `SpectrumProvider` with the resolved config.

See the project README for deploy-config wiring and the spectrum-provider
design doc in termin-compiler/docs/ for the architectural decisions.
"""

from termin_spectrum.provider import SpectrumProvider
from termin_spectrum.factory import spectrum_factory

__version__ = "0.1.0.dev0"

__all__ = ["SpectrumProvider", "spectrum_factory", "__version__"]
