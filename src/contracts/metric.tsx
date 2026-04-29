// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.metric — display a single computed number with
// label, or a structured breakdown when grouped.
//
// IR shapes (multiple — they all collapse onto this contract):
//   * aggregation: {source, label, agg_type} — a single number from
//     a server-side aggregate (count/sum/avg/etc.)
//   * stat_breakdown: {source, label, group_by} — a few numbers
//     grouped by a field (count by status, etc.); cap-3 in v0.9
//
// The actual value(s) come from bound_data when the page loads.
// For v0.1.x the renderer reads `bound_data[`metric.<source>`]` if
// present; otherwise displays the label with a "—" placeholder. The
// runtime-side metric computation is its own deferred slice.

import { ReactElement, createElement } from "react";
import { registerLocal, ContractRendererArgs } from "../walk";

interface MetricProps {
  source?: string;
  label?: string;
  agg_type?: string;
  group_by?: string;
}

export function renderMetric(args: ContractRendererArgs): ReactElement {
  const { node, data } = args;
  const props = (node.props as unknown as MetricProps) || {};
  // The runtime may put a precomputed value at `bound_data["metric." + source]`.
  // If absent, render a placeholder dash. (Apps that need real metric
  // values rely on the server-side compute slice — when that lands,
  // the bound_data shape stabilizes and this renderer pulls from the
  // canonical key.)
  const metricKey = props.source ? `metric.${props.source}` : null;
  const rawValue = metricKey ? (data as Record<string, unknown>)[metricKey] : null;
  const display =
    rawValue == null
      ? "—"
      : typeof rawValue === "number"
        ? rawValue.toLocaleString()
        : String(rawValue);
  return createElement(
    "div",
    {
      "data-termin-contract": "presentation-base.metric",
      "data-termin-source": props.source ?? "",
      style: {
        display: "inline-flex",
        flexDirection: "column",
        gap: "4px",
        padding: "12px 16px",
        border: "1px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1))",
        borderRadius: "8px",
        minWidth: "120px",
      },
    },
    createElement(
      "div",
      {
        style: {
          fontSize: "13px",
          opacity: 0.7,
          textTransform: "lowercase",
          letterSpacing: "0.02em",
        },
      },
      props.label ?? props.source ?? ""
    ),
    createElement(
      "div",
      {
        style: {
          fontSize: "28px",
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
        },
      },
      display
    )
  );
}

registerLocal("presentation-base.metric", renderMetric);
