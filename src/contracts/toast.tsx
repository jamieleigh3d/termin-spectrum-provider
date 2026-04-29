// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.toast — ephemeral, fixed-position notification.
//
// The IR currently emits this contract from `success shows toast "..."`
// transition feedback declarations and from compute-error TerminAtor
// routing. The runtime today surfaces toasts via flash-notification
// query params (`?_flash=...`) on SSR redirects — that path is
// SSR-specific and won't fire on B' shell pages.
//
// For v0.1.x the renderer just paints whatever toast prop is in the
// IR if present — i.e. statically declared toasts. Live toasts from
// action results or push events route through window.Termin's
// notification surface in a follow-on slice (the runtime needs to
// wire compute-error toasts to a WebSocket frame channel the bundle
// subscribes to).

import { ReactElement, createElement } from "react";
import { registerLocal, ContractRendererArgs } from "../walk";

interface ToastProps {
  message?: string;
  level?: "success" | "info" | "warning" | "error";
  dismiss_seconds?: number;
}

const _LEVEL_BG: Record<string, string> = {
  success: "rgb(21, 128, 61)",
  info: "rgb(29, 78, 216)",
  warning: "rgb(180, 83, 9)",
  error: "rgb(185, 28, 28)",
};

export function renderToast(args: ContractRendererArgs): ReactElement | null {
  const { node } = args;
  const props = (node.props as unknown as ToastProps) || {};
  if (!props.message) return null;
  const level = props.level || "info";
  return createElement(
    "div",
    {
      "data-termin-contract": "presentation-base.toast",
      "data-termin-level": level,
      role: "status",
      style: {
        position: "fixed",
        bottom: "16px",
        right: "16px",
        padding: "12px 16px",
        borderRadius: "8px",
        backgroundColor: _LEVEL_BG[level] || _LEVEL_BG.info,
        color: "white",
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        maxWidth: "360px",
        zIndex: 9999,
      },
    },
    props.message
  );
}

registerLocal("presentation-base.toast", renderToast);
