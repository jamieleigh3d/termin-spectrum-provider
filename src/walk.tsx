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
  const contract = node.contract ?? `presentation-base.${node.type ?? ""}`;
  const renderer = lookupRenderer(contract);
  if (!renderer) {
    console.warn(`[termin-spectrum] no renderer for contract: ${contract}`);
    return createElement(
      "div",
      { "data-termin-unknown-contract": contract },
      `[unknown contract: ${contract}]`
    );
  }
  // The per-contract renderer receives the node, the bound data, the
  // principal context, and a recursive `renderChildren` thunk so it
  // can compose its own children.
  return renderer({
    node,
    data: ctx.data,
    principal: ctx.principal,
    colorScheme: ctx.colorScheme,
    renderChildren: () => renderChildren(node, ctx),
  });
}

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
