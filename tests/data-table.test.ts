// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Unit tests for the data-table renderer's pure logic.
//
// The renderer's React-rendering path needs a real DOM to test —
// vitest can do that with happy-dom or jsdom, but for v0.1.x the
// branches that matter most are pure: the empty-state decision,
// the row key fallback, the redacted-sentinel handling, the action
// dispatch shape. Those are extracted as small helpers and tested
// directly. The actual DOM render is exercised by the spectrum-e2e
// integration tests in termin-compiler — those boot a real runtime
// and verify the bundle loads.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { isRedacted, lookupRecords } from "../src/glue/data";

describe("lookupRecords", () => {
  it("returns the array when the key is an array", () => {
    expect(
      lookupRecords({ products: [{ id: 1 }, { id: 2 }] }, "products")
    ).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("returns an empty array for a missing key", () => {
    expect(lookupRecords({}, "nope")).toEqual([]);
  });

  it("returns an empty array when the key is non-array", () => {
    expect(lookupRecords({ products: "oops" }, "products")).toEqual([]);
    expect(lookupRecords({ products: 42 }, "products")).toEqual([]);
    expect(lookupRecords({ products: null }, "products")).toEqual([]);
  });
});

describe("isRedacted on data-table cell values", () => {
  it("matches the wire shape from the runtime's Redacted JSON encoder", () => {
    // termin_runtime.providers.presentation_contract.redacted_json_default
    // emits this exact shape.
    const marker = {
      __redacted: true,
      field: "salary",
      expected_type: "currency",
      reason: "scope-not-granted",
    };
    expect(isRedacted(marker)).toBe(true);
  });

  it("rejects values that look similar but aren't markers", () => {
    expect(isRedacted({ __redacted: false })).toBe(false);
    expect(isRedacted({ field: "x", expected_type: "y" })).toBe(false);
    expect(isRedacted("redacted-string")).toBe(false);
    expect(isRedacted(null)).toBe(false);
    expect(isRedacted(undefined)).toBe(false);
  });
});

describe("data-table action dispatch shape (Termin.action invocation)", () => {
  // Verify that a transition / delete / unknown action dispatched
  // from a row-action button produces the canonical Termin.action
  // payload shape. We mock window.Termin and call the internal
  // action helper to check what it sends.

  beforeEach(() => {
    // jsdom isn't configured for this test file (we'd add it via
    // vitest's environment if we wanted full DOM). For now, mock
    // the global window object so the glue/action wrapper can find
    // Termin.
    (globalThis as unknown as { window: unknown }).window = {
      Termin: {
        action: vi.fn(async (payload: unknown) => ({
          ok: true,
          kind: (payload as { kind: string }).kind,
        })),
      },
    };
  });

  it("transition dispatch carries content + id + machine_name + target_state", async () => {
    const { action } = await import("../src/glue/action");
    const result = await action({
      kind: "transition",
      content: "products",
      id: 42,
      machine_name: "product_lifecycle",
      target_state: "active",
    });
    const T = (globalThis as unknown as { window: { Termin: { action: { mock: { calls: unknown[][] } } } } }).window.Termin;
    expect(T.action.mock.calls).toHaveLength(1);
    expect(T.action.mock.calls[0][0]).toMatchObject({
      kind: "transition",
      content: "products",
      id: 42,
      machine_name: "product_lifecycle",
      target_state: "active",
    });
    expect(result.ok).toBe(true);
  });

  it("delete dispatch carries content + id only", async () => {
    const { action } = await import("../src/glue/action");
    const result = await action({
      kind: "delete",
      content: "products",
      id: 7,
    });
    const T = (globalThis as unknown as { window: { Termin: { action: { mock: { calls: unknown[][] } } } } }).window.Termin;
    const lastCall = T.action.mock.calls[T.action.mock.calls.length - 1];
    expect(lastCall[0]).toMatchObject({
      kind: "delete",
      content: "products",
      id: 7,
    });
    expect(result.ok).toBe(true);
  });
});
