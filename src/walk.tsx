// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Component-tree walker — dispatches each node to the registered
// per-contract renderer.

import { Fragment, ReactNode, createElement } from "react";
import type { ComponentNode, PrincipalContext } from "./shell";

export interface RenderContext {
  data: Record<string, unknown>;
  principal: PrincipalContext;
  colorScheme: "light" | "dark";
}

export function walkAndRender(
  node: ComponentNode,
  data: Record<string, unknown>,
  principal: PrincipalContext,
  colorScheme: "light" | "dark"
): ReactNode {
  return renderNode(node, { data, principal, colorScheme });
}

function renderNode(node: ComponentNode, ctx: RenderContext): ReactNode {
  if (!node) return null;
  // Derive the contract: prefer node.contract when truthy (the IR's
  // explicit `presentation-base.<name>` form), otherwise fall through
  // to `presentation-base.<node.type>` from the legacy node.type field.
  // The IR's modifier children (filter, search, subscribe, related,
  // edit_modal, action_button, field_input) carry contract="" — they
  // collapse into their parent's renderer per BRD #2 §4.2 and should
  // not be walked as standalone. Treat unknown contracts as benign:
  // skip silently (no warning) when the contract is one of those
  // known modifier types, render an "unknown" placeholder otherwise
  // so misrenders are visible without taking down the React tree.
  const explicitContract =
    typeof node.contract === "string" && node.contract.length > 0
      ? node.contract
      : null;
  const contract =
    explicitContract ?? `presentation-base.${node.type ?? ""}`;
  const renderer = lookupRenderer(contract);
  if (!renderer) {
    if (_KNOWN_MODIFIER_TYPES.has(node.type ?? "")) {
      // Modifier appearing at a non-modifier site — silently skip.
      // The lowerer is supposed to nest these under their parent's
      // children list; the parent renderer consumes them as it sees
      // fit. If a modifier slips through to here it means either the
      // parent doesn't yet handle it (e.g., data-table doesn't render
      // filters in v0.1.x) or the lowerer placed it incorrectly.
      // Either way, rendering nothing is better than crashing.
      return null;
    }
    console.warn(`[termin-spectrum] no renderer for contract: ${contract}`);
    return createElement(
      "div",
      { "data-termin-unknown-contract": contract },
      `[unknown contract: ${contract}]`
    );
  }
  return renderer({
    node,
    data: ctx.data,
    principal: ctx.principal,
    colorScheme: ctx.colorScheme,
    renderChildren: () => renderChildren(node, ctx),
  });
}

// Modifier component types — these collapse into their parent's
// renderer (BRD #2 §4.2). When the walker encounters one as a node
// it tries to render directly, that's a structural site we don't
// support yet. Skip silently rather than warning every render.
const _KNOWN_MODIFIER_TYPES = new Set([
  "filter",
  "search",
  "subscribe",
  "highlight",
  "related",
  "action_button",
  "field_input",
  "edit_modal",
  "section",
  "semantic_mark",
]);

function renderChildren(node: ComponentNode, ctx: RenderContext): ReactNode {
  if (!node.children || node.children.length === 0) return null;
  return createElement(
    Fragment,
    null,
    ...node.children.map((child, idx) =>
      createElement(Fragment, { key: idx }, renderNode(child, ctx))
    )
  );
}

// The renderer registry is populated lazily by the per-contract files
// importing `registerLocal` — keeps this file's import graph small.
const _localRenderers: Record<string, ContractRenderer> = {};

export interface ContractRendererArgs {
  node: ComponentNode;
  data: Record<string, unknown>;
  principal: PrincipalContext;
  colorScheme: "light" | "dark";
  renderChildren: () => ReactNode;
}

export type ContractRenderer = (args: ContractRendererArgs) => ReactNode;

export function registerLocal(contract: string, fn: ContractRenderer): void {
  _localRenderers[contract] = fn;
}

function lookupRenderer(contract: string): ContractRenderer | null {
  return _localRenderers[contract] ?? null;
}
