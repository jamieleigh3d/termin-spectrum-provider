// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.markdown — render server-sanitized HTML.
//
// The runtime's markdown sanitizer (termin_runtime/markdown_sanitizer.py)
// runs BEFORE data reaches this bundle, per BRD #2 §7.3 ("contract-
// specified, not provider discretion"). This renderer treats the
// payload as already-safe HTML and uses dangerouslySetInnerHTML — the
// safety contract is enforced server-side, the bundle just paints.
//
// Falls back to plain text rendering when the prop is missing or
// non-string.

import { ReactElement, createElement } from "react";
import { registerLocal, ContractRendererArgs } from "../walk";

interface MarkdownProps {
  // The server emits one of these depending on the lowering path —
  // check both for forward-compat.
  html?: string;
  content?: string;
  value?: string;
}

export function renderMarkdown(args: ContractRendererArgs): ReactElement {
  const { node } = args;
  const props = (node.props as unknown as MarkdownProps) || {};
  const html = props.html ?? props.content ?? props.value ?? "";
  return createElement("div", {
    "data-termin-contract": "presentation-base.markdown",
    className: "termin-prose",
    style: {
      // Light typographic adjustment — plain prose tends to look
      // cramped at Spectrum's default body line-height.
      lineHeight: 1.6,
    },
    dangerouslySetInnerHTML: { __html: String(html) },
  });
}

registerLocal("presentation-base.markdown", renderMarkdown);
