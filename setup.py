# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

from setuptools import setup, find_packages

setup(
    name="termin-spectrum-provider",
    version="0.1.0.dev0",
    description="Adobe Spectrum 2 presentation provider for Termin",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="Jamie-Leigh Blake",
    license="Apache-2.0",
    url="https://github.com/jamieleigh3d/termin-spectrum-provider",
    project_urls={
        "Homepage": "https://termin.dev",
        "Source": "https://github.com/jamieleigh3d/termin-spectrum-provider",
        "Issues": "https://github.com/jamieleigh3d/termin-spectrum-provider/issues",
    },
    packages=find_packages(exclude=["tests_py", "tests_py.*", "tests", "tests.*"]),
    include_package_data=True,
    package_data={
        # The built JS bundle ships as package data. Built in CI; not
        # committed (see .gitignore). Wheel-builds on release tags
        # produce the artifact and bake it in.
        "termin_spectrum": ["static/bundle.js"],
    },
    python_requires=">=3.11",
    install_requires=[
        # The provider Protocol, contract registry, and PresentationData
        # types live in termin-compiler. Pin to the v0.9 line until
        # both stabilize.
        "termin-compiler>=0.9.0",
    ],
    extras_require={
        "test": [
            "pytest>=8",
            "pytest-asyncio>=0.21",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: Apache Software License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Software Development :: Libraries",
    ],
)
