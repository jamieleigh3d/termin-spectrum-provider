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
    register_spectrum — registers the provider against all ten
        `presentation-base.<contract>` names. Auto-invoked by the
        Termin runtime via the `termin.providers` entry-point group;
        callers don't normally need to call it directly.

See the project README for deploy-config wiring and the spectrum-provider
design doc in termin-compiler/docs/ for the architectural decisions.
"""

# Canonical package version per docs/version-policy.md §2.1 in
# termin-compiler. release.py bumps THIS value; everywhere else that
# needs the package version (registration.py's provider record, the
# bundle build pipeline) imports it from here.
#
# Declared BEFORE the submodule imports below because
# registration.py does `from termin_spectrum import __version__`
# at module-load time; the assignment must happen first.
__version__ = "0.9.3"

from termin_spectrum.provider import SpectrumProvider  # noqa: E402
from termin_spectrum.factory import spectrum_factory  # noqa: E402
from termin_spectrum.registration import register_spectrum  # noqa: E402

__all__ = [
    "SpectrumProvider",
    "spectrum_factory",
    "register_spectrum",
    "__version__",
]
