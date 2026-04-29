// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Labeled placeholder for contracts that don't have a real renderer
// yet. Renders a visible marker so debugging is obvious; doesn't crash
// on unknown contract data.

import { createElement } from "react";
import { registerLocal, ContractRenderer, ContractRendererArgs } from "../walk";

export function renderPlaceholder(contract: string): ContractRenderer {
  const renderer: ContractRenderer = (args: ContractRendererArgs) => {
    return createElement(
      "div",
      {
        "data-termin-contract": contract,
        "data-termin-unimplemented": "true",
        style: {
          padding: "8px 12px",
          margin: "4px 0",
          border: "1px dashed #999",
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#666",
        },
      },
      `[${contract} — unimplemented in v0.1.0]`,
      args.renderChildren()
    );
  };
  // Self-register so the walker can find this contract even though
  // the parent `index.tsx` also registers it via the Termin global.
  registerLocal(contract, renderer);
  return renderer;
}
