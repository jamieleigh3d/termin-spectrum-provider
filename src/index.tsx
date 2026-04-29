// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Bundle entry point. Loaded as a single IIFE <script> by termin.js
// after `loadCsrBundles()` discovers it via /_termin/presentation/bundles.
//
// Responsibility: register the B' shell renderer (`__app_shell__`) and
// per-contract renderers with the Termin global. Once registered,
// the runtime's Termin.navigate(...) flow drives rendering by handing
// the shell a fresh component-tree-IR + bound-data + principal-context.

import { renderShell } from "./shell";
import { renderPage } from "./contracts/page";
import { renderText } from "./contracts/text";
import { renderPlaceholder } from "./contracts/placeholder";

// The Termin global shape is set up by termin_runtime/static/termin.js
// long before this bundle loads. We assume it exists; if it doesn't
// the bundle was loaded outside a Termin runtime — log and bail.
declare global {
  interface Window {
    Termin?: {
      registerRenderer: (contract: string, fn: unknown) => void;
      navigate: (path: string) => Promise<void>;
      action: (payload: unknown) => Promise<unknown>;
      subscribe: (channel: string, handler: unknown) => void;
      unsubscribe: (channel: string, handler: unknown) => void;
    };
  }
}

function register(): void {
  const T = window.Termin;
  if (!T) {
    console.warn(
      "[termin-spectrum] Termin global not present; " +
        "bundle loaded outside a Termin runtime?"
    );
    return;
  }

  // The B' shell — the runtime hands this the full bootstrap payload
  // on first render and on every Termin.navigate() call.
  T.registerRenderer("__app_shell__", renderShell);

  // Per-contract renderers — v0.1.0 ships `page` and `text` for real;
  // the remaining eight `presentation-base` contracts get a labeled
  // placeholder that renders "<contract> (unimplemented)" so any
  // example using them runs without crashing while we fill them in.
  T.registerRenderer("presentation-base.page", renderPage);
  T.registerRenderer("presentation-base.text", renderText);

  for (const placeholder of [
    "presentation-base.markdown",
    "presentation-base.data-table",
    "presentation-base.form",
    "presentation-base.chat",
    "presentation-base.metric",
    "presentation-base.nav-bar",
    "presentation-base.toast",
    "presentation-base.banner",
  ]) {
    T.registerRenderer(placeholder, renderPlaceholder(placeholder));
  }

  console.log(
    "[termin-spectrum] registered renderers (v0.1.0 — page + text live)"
  );
}

register();
