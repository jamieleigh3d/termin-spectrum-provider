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

import { ReactNode, createElement } from "react";
import { Provider } from "@react-spectrum/s2";
import { PageChrome, type AppChrome } from "./chrome";
// Importing page.css for its side effect — the esbuild CSS-inject
// plugin (see ../esbuild-css-inject-plugin.mjs) turns each .css
// import into a runtime <style>-tag injection. Same plumbing
// handles the per-component CSS that Spectrum 2's distribution
// auto-imports inside its modules; this top-level import covers
// the page-scoped custom properties (color-scheme tokens, etc.).
import "@react-spectrum/s2/page.css";
import "./termin-spectrum.css";
import { walkAndRender } from "./walk";
import type { ComponentNode, PrincipalContext } from "./shell";

export interface AppProps {
  tree: ComponentNode;
  data: Record<string, unknown>;
  principal: PrincipalContext;
  chrome?: AppChrome;
}

export function App({ tree, data, principal, chrome }: AppProps): ReactNode {
  const themePreference = principal.preferences?.theme ?? "auto";
  const colorScheme = resolveColorScheme(themePreference);

  const pageContent = walkAndRender(tree, data, principal, colorScheme);
  // The chrome lives inside the Spectrum Provider so its TextField /
  // Picker / ActionButton inherit the same color-scheme tokens as
  // the page body. Bootstrap payloads from older runtime versions
  // may omit `chrome` — fall back to bare page content in that case.
  const body = chrome
    ? createElement(PageChrome, { chrome }, pageContent)
    : pageContent;

  return (
    <Provider colorScheme={colorScheme} background="base">
      {body}
    </Provider>
  );
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
