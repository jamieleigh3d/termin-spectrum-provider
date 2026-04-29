// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Thin wrapper over Termin.action — the real dispatch lives in
// termin_runtime/static/termin.js (Q-extra: client-side dispatch to
// the existing REST surface). This file just re-exports a typed
// signature for convenience inside renderers.

export interface ActionPayload {
  kind: "create" | "update" | "delete" | "transition" | "compute";
  content?: string;
  id?: string | number;
  payload?: Record<string, unknown>;
  target_state?: string;
  machine_name?: string;
  compute_name?: string;
  input?: Record<string, unknown>;
}

export interface ActionResult {
  ok: boolean;
  kind?: string;
  status?: number;
  data?: unknown;
  error?: string;
}

export async function action(payload: ActionPayload): Promise<ActionResult> {
  const T = window.Termin;
  if (!T) {
    return { ok: false, error: "Termin global not available" };
  }
  return (await T.action(payload)) as ActionResult;
}
