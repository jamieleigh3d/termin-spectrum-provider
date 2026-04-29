// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Single all-in-one bundle per Q5 design decision. IIFE format because
// the bundle is loaded via <script src="..."> and self-executes — no
// ES module import surface. Externals: none. React + ReactDOM +
// Spectrum + glue all bundled together. Target ~150KB gzipped.

import * as esbuild from "esbuild";
import { cssInjectPlugin } from "./esbuild-css-inject-plugin.mjs";

const watch = process.argv.includes("--watch");

const config = {
  entryPoints: ["src/index.tsx"],
  bundle: true,
  format: "iife",
  target: "es2020",
  outfile: "termin_spectrum/static/bundle.js",
  minify: !watch,
  sourcemap: watch,
  jsx: "automatic",
  loader: {
    ".ts": "ts",
    ".tsx": "tsx",
  },
  // CSS imports — Spectrum 2 self-imports per-component stylesheets
  // (`import "./TableView.css"` etc.). The plugin intercepts each
  // import and turns it into JS that injects the CSS as a <style>
  // tag at module-evaluation time. Keeps the provider a single .js
  // artifact even though the upstream build (Parcel) ships separate
  // CSS files.
  plugins: [cssInjectPlugin],
  define: {
    "process.env.NODE_ENV": watch ? '"development"' : '"production"',
  },
  logLevel: "info",
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("[esbuild] watching for changes...");
} else {
  await esbuild.build(config);
  console.log("[esbuild] build complete -> " + config.outfile);
}
