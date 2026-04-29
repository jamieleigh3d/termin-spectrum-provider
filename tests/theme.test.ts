// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Q4 theme mapping — verify the Termin enum collapses onto the
// Spectrum color-scheme correctly.

import { describe, it, expect, vi } from "vitest";
import { isRedacted } from "../src/glue/data";

describe("isRedacted", () => {
  it("returns true for a redaction marker", () => {
    expect(
      isRedacted({
        __redacted: true,
        field: "salary",
        expected_type: "currency",
        reason: null,
      })
    ).toBe(true);
  });

  it("returns false for plain values", () => {
    expect(isRedacted("hello")).toBe(false);
    expect(isRedacted(42)).toBe(false);
    expect(isRedacted(null)).toBe(false);
    expect(isRedacted(undefined)).toBe(false);
    expect(isRedacted({})).toBe(false);
    expect(isRedacted({ field: "x" })).toBe(false);
  });

  it("returns false for objects with __redacted: false", () => {
    expect(isRedacted({ __redacted: false })).toBe(false);
  });
});
