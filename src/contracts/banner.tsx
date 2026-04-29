// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.banner — inline notification, persistent until
// dismissed (vs toast which auto-dismisses).
//
// Same level enum + props shape as toast. Renders as an inline block
// at the top of its container rather than fixed-position.

import { ReactElement, createElement } from "react";
import { registerLocal, ContractRendererArgs } from "../walk";

interface BannerProps {
  message?: string;
  level?: "success" | "info" | "warning" | "error";
}

const _LEVEL_BG: Record<string, string> = {
  success: "rgba(21, 128, 61, 0.15)",
  info: "rgba(29, 78, 216, 0.15)",
  warning: "rgba(180, 83, 9, 0.15)",
  error: "rgba(185, 28, 28, 0.15)",
};
const _LEVEL_BORDER: Record<string, string> = {
  success: "rgb(21, 128, 61)",
  info: "rgb(29, 78, 216)",
  warning: "rgb(180, 83, 9)",
  error: "rgb(185, 28, 28)",
};

export function renderBanner(args: ContractRendererArgs): ReactElement | null {
  const { node } = args;
  const props = (node.props as unknown as BannerProps) || {};
  if (!props.message) return null;
  const level = props.level || "info";
  return createElement(
    "div",
    {
      "data-termin-contract": "presentation-base.banner",
      "data-termin-level": level,
      role: "alert",
      style: {
        padding: "12px 16px",
        borderRadius: "6px",
        borderLeft: `4px solid ${_LEVEL_BORDER[level] || _LEVEL_BORDER.info}`,
        backgroundColor: _LEVEL_BG[level] || _LEVEL_BG.info,
      },
    },
    props.message
  );
}

registerLocal("presentation-base.banner", renderBanner);
