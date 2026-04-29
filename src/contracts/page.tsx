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
import { Heading } from "@react-spectrum/s2";
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
  // Wrap content in a <main> with breathing room. Using inline style
  // (not Spectrum's style() macro — that needs Parcel; see
  // esbuild-css-inject-plugin.mjs for the build-tool tradeoffs we
  // accept) is good enough for v0.1.x. The Spectrum Heading picks up
  // the typography tokens from the Provider above; the rest of the
  // contract rendering inherits Spectrum's surface colors and font.
  return createElement(
    "main",
    {
      "data-termin-contract": "presentation-base.page",
      style: {
        padding: "24px 32px",
        minHeight: "100vh",
        // The Provider sets background="base" which paints the body;
        // <main> just provides padding and stack layout for content.
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      },
    },
    title
      ? createElement(
          Heading,
          { level: 1, "data-termin-page-title": "" } as any,
          title
        )
      : null,
    renderChildren()
  );
}

registerLocal("presentation-base.page", renderPage);
