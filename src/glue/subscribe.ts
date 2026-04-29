// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Thin wrapper over Termin.subscribe / Termin.unsubscribe.
// Real WebSocket multiplexing lives in termin.js; this file types the
// surface so renderers can subscribe to channels in a typed way.

export type SubscriptionHandler = (payload: unknown, channel?: string) => void;

export function subscribe(
  channel: string,
  handler: SubscriptionHandler
): () => void {
  const T = window.Termin;
  if (!T) {
    console.warn("[termin-spectrum] Termin global not available for subscribe");
    return () => {};
  }
  T.subscribe(channel, handler);
  return () => T.unsubscribe(channel, handler);
}
