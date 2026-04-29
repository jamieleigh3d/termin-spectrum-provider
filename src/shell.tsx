// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// The B' shell renderer. Receives the runtime's bootstrap payload and
// renders the root of the React tree into #termin-root.

import { createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import { App } from "./theme";

// One persistent React root for the document. `Termin.navigate(...)`
// re-invokes this function with a new payload; we re-render into the
// same root so React reconciles instead of remounting.
let _root: Root | null = null;

export interface BootstrapPayload {
  component_tree_ir: ComponentNode;
  bound_data: Record<string, unknown>;
  principal_context: PrincipalContext;
  subscriptions_to_open: string[];
}

export interface ComponentNode {
  type?: string;
  contract?: string;
  props?: Record<string, unknown>;
  style?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  children?: ComponentNode[];
}

export interface PrincipalContext {
  id?: string;
  display_name?: string;
  is_anonymous?: boolean;
  scopes?: string[];
  preferences?: Record<string, string>;
}

export function renderShell(
  componentTreeIr: ComponentNode,
  boundData: Record<string, unknown>,
  principalContext: PrincipalContext,
  subscriptionsToOpen: string[]
): void {
  const container = document.getElementById("termin-root");
  if (!container) {
    console.warn("[termin-spectrum] #termin-root not found in document");
    return;
  }
  if (!_root) {
    _root = createRoot(container);
  }

  // Open WebSocket subscriptions the runtime told us to. Channel-level
  // dispatch is wired through Termin.subscribe; per-contract renderers
  // get the data they need via the bound_data map at render time.
  for (const channel of subscriptionsToOpen) {
    window.Termin?.subscribe(channel, () => {
      // Re-fetch and re-render on push events for v0.1.0. A future
      // slice will swap this for an in-place delta application driven
      // by the same hydrator pattern termin.js uses today.
    });
  }

  // Normalize the root: the IR's PageEntry (the top-level node) has
  // `name` / `slug` / `children` but no `contract` or `type` field.
  // Tag it so the walker dispatches to the page renderer.
  const normalizedTree: ComponentNode = {
    ...componentTreeIr,
    contract: componentTreeIr.contract || "presentation-base.page",
    type: componentTreeIr.type || "page",
  };

  _root.render(
    createElement(App, {
      tree: normalizedTree,
      data: boundData,
      principal: principalContext,
    })
  );
}
