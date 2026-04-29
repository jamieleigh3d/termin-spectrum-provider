// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.page — the page-level container.
//
// v0.1.0 ships a minimal layout: a top-level <main> with the page
// title (if present in props) and the recursively-rendered children.
// Spectrum primitives land once data-table / form arrive — at which
// point this gets wrapped in Spectrum's <Provider> with the color
// scheme.

import { createElement } from "react";
import { registerLocal, ContractRendererArgs } from "../walk";

export function renderPage(args: ContractRendererArgs) {
  const { node, renderChildren } = args;
  const title = (node.props?.title as string | undefined) ?? "";
  return createElement(
    "main",
    { "data-termin-contract": "presentation-base.page" },
    title
      ? createElement(
          "h1",
          { "data-termin-page-title": "" },
          title
        )
      : null,
    renderChildren()
  );
}

registerLocal("presentation-base.page", renderPage);
