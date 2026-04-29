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
  // The IR's PageEntry stores the visible title in `name` (the
  // `As <role>, I want to see a page "<name>"` source verb), with
  // `slug` as the URL form. Some contract-package pages may use
  // `props.title` instead — fall back to that.
  const title =
    ((node as unknown as { name?: string }).name) ||
    (node.props?.title as string | undefined) ||
    "";
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
