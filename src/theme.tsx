// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Theme + root <App> wrapper.
//
// Q4 maps Termin's four-value theme enum onto Spectrum 2:
//   light          -> spectrum-light
//   dark           -> spectrum-dark
//   auto           -> prefers-color-scheme media query
//   high-contrast  -> spectrum-dark + HC token override layer (deferred)
//
// v0.1.0 ships the light/dark/auto path; high-contrast falls back to
// dark + Spectrum's built-in @media (forced-colors) handling. The
// explicit HC token override layer is a 0.3.0 slice (per the design
// doc's successive-slices plan).

import { ReactNode } from "react";
import { walkAndRender } from "./walk";
import type { ComponentNode, PrincipalContext } from "./shell";

export interface AppProps {
  tree: ComponentNode;
  data: Record<string, unknown>;
  principal: PrincipalContext;
}

export function App({ tree, data, principal }: AppProps): ReactNode {
  const themePreference = principal.preferences?.theme ?? "auto";
  const colorScheme = resolveColorScheme(themePreference);

  // v0.1.0: render the tree without a Spectrum <Provider> wrapper while
  // the shell + page + text renderers are still establishing the basic
  // pattern. Once the first Spectrum-using contract (data-table or
  // form) lands, this gets wrapped in <Provider theme={...}> with the
  // resolved color scheme. Until then the wrapper would be a no-op
  // theme application against zero Spectrum components.
  return walkAndRender(tree, data, principal, colorScheme);
}

function resolveColorScheme(pref: string): "light" | "dark" {
  if (pref === "light") return "light";
  if (pref === "dark") return "dark";
  if (pref === "high-contrast") return "dark"; // Q4 stub; 0.3.0 adds override layer
  // auto — trust the browser's prefers-color-scheme.
  if (typeof window !== "undefined" && window.matchMedia) {
    const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return dark ? "dark" : "light";
  }
  return "light";
}
