// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.text — render a literal or expression-evaluated
// text node.

import { createElement } from "react";
import { registerLocal, ContractRendererArgs } from "../walk";

export function renderText(args: ContractRendererArgs) {
  const { node } = args;
  // The IR's PropValue distinguishes literals from expressions; the
  // bootstrap-payload builder pre-evaluates expressions before this
  // bundle ever sees the data, so we treat `props.value` as a plain
  // string here.
  const value = (node.props?.value as string | undefined) ?? "";
  return createElement(
    "span",
    { "data-termin-contract": "presentation-base.text" },
    value
  );
}

registerLocal("presentation-base.text", renderText);
