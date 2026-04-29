// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Bound-data lookup helpers + Redacted sentinel detection.

export interface RedactedMarker {
  __redacted: true;
  field: string;
  expected_type: string;
  reason: string | null;
}

export function isRedacted(value: unknown): value is RedactedMarker {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { __redacted?: boolean }).__redacted === true
  );
}

export function lookupRecords(
  data: Record<string, unknown>,
  source: string
): Array<Record<string, unknown>> {
  const value = data[source];
  if (Array.isArray(value)) {
    return value as Array<Record<string, unknown>>;
  }
  return [];
}

export function lookupValue(
  data: Record<string, unknown>,
  key: string
): unknown {
  return data[key];
}
