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

import { ReactNode, useEffect } from "react";
import { Provider } from "@react-spectrum/s2";
import spectrumPageCss from "@react-spectrum/s2/page.css";
import { walkAndRender } from "./walk";
import type { ComponentNode, PrincipalContext } from "./shell";

export interface AppProps {
  tree: ComponentNode;
  data: Record<string, unknown>;
  principal: PrincipalContext;
}

// Inject Spectrum 2's page.css into the document head once. The CSS
// sets up custom properties Spectrum components depend on. esbuild
// bundles the CSS as a string via the text loader (see
// esbuild.config.mjs) so the provider ships as a single .js artifact.
function ensureSpectrumStylesInjected(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector("style[data-termin-spectrum-page-css]")) return;
  const style = document.createElement("style");
  style.dataset.terminSpectrumPageCss = "1";
  style.textContent = spectrumPageCss as unknown as string;
  document.head.appendChild(style);
}

export function App({ tree, data, principal }: AppProps): ReactNode {
  const themePreference = principal.preferences?.theme ?? "auto";
  const colorScheme = resolveColorScheme(themePreference);

  // CSS injection runs once per component mount; the helper itself is
  // idempotent (checks for the marker before appending). Effect so it
  // runs after the initial render commit, by which point document is
  // ready.
  useEffect(() => {
    ensureSpectrumStylesInjected();
  }, []);

  return (
    <Provider colorScheme={colorScheme}>
      {walkAndRender(tree, data, principal, colorScheme)}
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
