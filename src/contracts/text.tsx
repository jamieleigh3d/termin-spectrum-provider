// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.text — render a literal or expression-evaluated
// text node.

import { createElement } from "react";
import { registerLocal, ContractRendererArgs } from "../walk";

export function renderText(args: ContractRendererArgs) {
  const { node } = args;
  // The IR's `presentation-base.text` lowering puts the rendered text
  // in `props.content` (matches the `Display text "..."` source verb).
  // The bootstrap-payload builder pre-evaluates CEL expressions before
  // this bundle ever sees the data, so we treat the prop as a plain
  // string. `props.value` is checked as a fallback for any future
  // contract-package text variant that uses a different prop name.
  const value =
    (node.props?.content as string | undefined) ??
    (node.props?.value as string | undefined) ??
    "";
  return createElement(
    "span",
    { "data-termin-contract": "presentation-base.text" },
    value
  );
}

registerLocal("presentation-base.text", renderText);
