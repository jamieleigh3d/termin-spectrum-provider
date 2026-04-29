// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
//
// esbuild plugin that turns every `import "./X.css"` into JS code
// that appends the CSS into document.head as a <style> tag at
// module-evaluation time.
//
// Why this exists: Spectrum 2's distribution self-imports its
// per-component CSS via `import "./TableView.css"` etc. With
// esbuild's default behaviour (or its text loader) those imports
// don't reach the document — components mount unstyled. Spectrum's
// own build (Parcel) handles this via its CSS-bundling pipeline;
// for our single-IIFE-bundle target, we inline + inject so the
// provider stays a single .js artifact.
//
// The deduplication on `data-termin-spectrum-css` prevents the
// same stylesheet from injecting twice if multiple modules import
// the same file (uncommon but cheap to guard).

import { readFile } from "node:fs/promises";
import { basename } from "node:path";

export const cssInjectPlugin = {
  name: "termin-css-inject",
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async (args) => {
      const css = await readFile(args.path, "utf8");
      // The CSS is embedded as a JSON-encoded string so all special
      // characters (quotes, backslashes, line endings) round-trip
      // safely through the JS source.
      const cssLiteral = JSON.stringify(css);
      const marker = JSON.stringify(basename(args.path));
      const js = `
(function() {
  if (typeof document === "undefined") return;
  var key = "termin-spectrum-css:" + ${marker};
  if (document.querySelector('style[data-termin-spectrum-css=' + JSON.stringify(${marker}) + ']')) return;
  var s = document.createElement("style");
  s.setAttribute("data-termin-spectrum-css", ${marker});
  s.textContent = ${cssLiteral};
  document.head.appendChild(s);
})();
`;
      return { contents: js, loader: "js" };
    });
  },
};
