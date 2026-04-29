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
import { renderDataTable } from "./contracts/data-table";
import { renderForm } from "./contracts/form";
import { renderMarkdown } from "./contracts/markdown";
import { renderMetric } from "./contracts/metric";
import { renderNavBar } from "./contracts/nav-bar";
import { renderToast } from "./contracts/toast";
import { renderBanner } from "./contracts/banner";
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

  // Per-contract renderers — v0.1.x ships `page`, `text`, and
  // `data-table` for real; the remaining seven `presentation-base`
  // contracts get a labeled placeholder that renders "<contract>
  // (unimplemented)" so any example using them runs without crashing
  // while we fill them in.
  T.registerRenderer("presentation-base.page", renderPage);
  T.registerRenderer("presentation-base.text", renderText);
  T.registerRenderer("presentation-base.data-table", renderDataTable);
  T.registerRenderer("presentation-base.form", renderForm);
  T.registerRenderer("presentation-base.markdown", renderMarkdown);
  T.registerRenderer("presentation-base.metric", renderMetric);
  T.registerRenderer("presentation-base.nav-bar", renderNavBar);
  T.registerRenderer("presentation-base.toast", renderToast);
  T.registerRenderer("presentation-base.banner", renderBanner);

  // Only `chat` remains as a placeholder — its streaming integration
  // is the most complex contract and lands in its own dedicated slice.
  T.registerRenderer(
    "presentation-base.chat",
    renderPlaceholder("presentation-base.chat")
  );

  console.log(
    "[termin-spectrum] registered renderers (v0.1.x — 9/10 presentation-base contracts live; chat remains placeholder)"
  );

  // Initial paint. termin.js's `Termin.navigate(...)` drives subsequent
  // page transitions, but the first render needs a kick — the bootstrap
  // JSON island is in `window.__termin_bootstrap`, embedded by the
  // server's shell endpoint. Read it once, render once. If a future
  // version of termin.js takes over the initial-render trigger, this
  // can be removed; for v0.1.0 the bundle owns it.
  const bootstrap = (window as unknown as {
    __termin_bootstrap?: {
      component_tree_ir?: unknown;
      bound_data?: Record<string, unknown>;
      principal_context?: Record<string, unknown>;
      subscriptions_to_open?: string[];
    };
  }).__termin_bootstrap;
  if (bootstrap && bootstrap.component_tree_ir) {
    renderShell(
      bootstrap.component_tree_ir as Parameters<typeof renderShell>[0],
      bootstrap.bound_data || {},
      (bootstrap.principal_context || {}) as Parameters<typeof renderShell>[2],
      bootstrap.subscriptions_to_open || []
    );
  } else {
    console.log(
      "[termin-spectrum] no __termin_bootstrap found; awaiting Termin.navigate()"
    );
  }
}

register();
