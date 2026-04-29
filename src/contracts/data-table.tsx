// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.data-table — Spectrum 2's TableView with rows
// sourced from `bound_data[props.source]` and per-row action buttons
// dispatched through Termin.action().
//
// Scope of this slice (v0.1.x):
//   * Core columns + rows from props.columns + bound_data
//   * Row-action buttons for kinds: transition, delete
//   * Empty-state message when the source has no records
//   * Redacted-sentinel handling — render "—" with the
//     data-termin-redacted attribute so accessibility can pick it up
//
// Deferred to follow-on slices:
//   * Inline-editable fields (props.inline_editable_fields) — needs
//     edit-mode UX + form submission flow
//   * Filter / search / highlight / subscribe modifiers (children) —
//     each is its own primitive
//   * Related child-table rendering (children[type=related]) —
//     composes with this primitive but is its own thing
//   * `visible_when` CEL evaluation — for now every row action is
//     rendered unconditionally; the runtime rejects invalid actions
//     server-side (403 / 409). Cleaner UX once we have a CEL-in-JS
//     evaluator or pre-evaluated visibility fields in bound_data.
//   * The `edit` action kind — opens an edit modal; deferred until
//     the form contract lands

import { ReactNode, ReactElement, createElement, Key } from "react";
import {
  TableView,
  TableHeader,
  TableBody,
  Column,
  Row,
  Cell,
  ActionButton,
  ActionButtonGroup,
} from "@react-spectrum/s2";
import { registerLocal, ContractRendererArgs } from "../walk";
import { isRedacted, lookupRecords } from "../glue/data";
import { action } from "../glue/action";

// IR shapes — narrow types, only what this renderer reads. Keeps
// the dependency surface against the IR small.
interface ColumnSpec {
  field: string;
  label: string;
}

interface RowActionSpec {
  type: "action_button";
  props: {
    label: string;
    action: "transition" | "delete" | "edit" | string;
    machine_name?: string;
    target_state?: string;
    required_scope?: string;
    visible_when?: { value: string; is_expr: boolean };
    unavailable_behavior?: "hide" | "disable";
  };
}

interface DataTableProps {
  source: string;
  columns: ColumnSpec[];
  row_actions?: RowActionSpec[];
}

const ACTIONS_COLUMN_ID = "__termin_actions__";

export function renderDataTable(args: ContractRendererArgs): ReactElement {
  const { node, data } = args;
  const props = (node.props as unknown as DataTableProps) || {
    source: "",
    columns: [],
  };
  const records = lookupRecords(data, props.source);
  const rowActions = props.row_actions || [];
  const hasActions = rowActions.length > 0;

  // The columns list exposed to TableView/TableHeader/Row. React Aria's
  // collection API needs each column entry to expose an `id` field so
  // it can key columns deterministically — without it, TableView throws
  // "Could not determine key for item" and the entire React tree
  // unmounts (white page). The IR uses `field` for the column key; we
  // mirror it as `id` for React Aria + keep `field` for our own bound-
  // data lookups in the row render. Synthetic actions column gets the
  // stable ACTIONS_COLUMN_ID.
  const tableColumns: Array<
    ColumnSpec & { id: string; __actions?: boolean }
  > = [
    ...props.columns.map((c) => ({ ...c, id: c.field })),
    ...(hasActions
      ? [{
          field: ACTIONS_COLUMN_ID,
          id: ACTIONS_COLUMN_ID,
          label: "Actions",
          __actions: true as const,
        }]
      : []),
  ];

  // Empty-state branch — TableView's renderEmptyState slot would also
  // work, but a plain message reads more cleanly when no rows ever
  // arrive (rather than "no results matching filter" semantics).
  if (records.length === 0) {
    return createElement(
      "div",
      {
        "data-termin-contract": "presentation-base.data-table",
        "data-termin-source": props.source,
        "data-termin-empty": "true",
        style: { padding: "24px", color: "var(--spectrum-gray-700, #666)" },
      },
      `No ${props.source} yet.`
    );
  }

  return createElement(
    "div",
    {
      "data-termin-contract": "presentation-base.data-table",
      "data-termin-source": props.source,
    },
    createElement(
      TableView,
      {
        "aria-label": `Table of ${props.source}`,
        // Default density (no compact override). Compact crams cell
        // text into 32px-tall rows where multi-word values (e.g.
        // "raw material", "finished good") truncate to "raw m...".
      } as any,
      createElement(
        TableHeader,
        { columns: tableColumns } as any,
        ((col: ColumnSpec & { __actions?: boolean }) =>
          createElement(
            Column,
            {
              id: col.field,
              isRowHeader: col.field === "id",
              // Actions column needs room for an ActionButtonGroup
              // with up to 4 buttons; the rest get a sensible
              // default that beats Spectrum's auto-width. Apps that
              // want different sizing can override via deploy
              // config (a future slice — for v0.1.x widths are
              // baked in).
              minWidth: col.__actions ? 320 : 120,
            } as any,
            col.label
          )) as unknown as ReactNode
      ),
      createElement(
        TableBody,
        { items: records as Iterable<Record<string, unknown>> } as any,
        ((row: Record<string, unknown>) =>
          createElement(
            Row,
            {
              id: rowKey(row),
              columns: tableColumns,
            } as any,
            ((col: ColumnSpec & { __actions?: boolean }) =>
              createElement(
                Cell,
                {} as any,
                col.__actions
                  ? renderRowActions(props.source, row, rowActions)
                  : renderCellValue(row[col.field])
              )) as unknown as ReactNode
          )) as unknown as ReactNode
      )
    )
  );
}

function rowKey(row: Record<string, unknown>): Key {
  const id = row.id;
  if (typeof id === "string" || typeof id === "number") return id;
  // Stable fallback — JSON.stringify the row. Slow but only fires
  // for rows missing an `id` field, which is non-conformant data.
  return JSON.stringify(row);
}

function renderCellValue(value: unknown): ReactNode {
  if (isRedacted(value)) {
    return createElement(
      "span",
      {
        "data-termin-redacted": "true",
        "aria-label": "Redacted",
        style: { color: "var(--spectrum-gray-600, #999)" },
      },
      "—"
    );
  }
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function renderRowActions(
  source: string,
  row: Record<string, unknown>,
  actions: RowActionSpec[]
): ReactNode {
  // v0.9 Phase 5b.4 0.2: the runtime pre-evaluates per-row visibility
  // and attaches `__visible_actions` to each row in bound_data. We
  // filter by that label list before rendering — only authorized
  // actions ever paint. The bundle is no longer the trust boundary;
  // it's pure presentation. (When `__visible_actions` is undefined
  // — older runtime / contract package contexts — fall back to
  // showing every action, matching the v0.1.x behavior.)
  const allowed = row["__visible_actions"];
  const visibleActions = Array.isArray(allowed)
    ? actions.filter((a) =>
        (allowed as unknown[]).includes(a.props.label)
      )
    : actions;

  if (visibleActions.length === 0) {
    // No actions for this row → render an empty placeholder so the
    // Cell still has content (some Spectrum versions warn on null
    // children) and the column width stays consistent across rows.
    return createElement("span", {
      "data-termin-row-no-actions": "",
      style: { color: "var(--spectrum-gray-600, #999)" },
    }, "");
  }

  // ActionButtonGroup gives the buttons consistent spacing + keyboard
  // navigation; Spectrum handles the rest.
  return createElement(
    ActionButtonGroup,
    {
      density: "compact",
      "aria-label": "Row actions",
    } as any,
    ...visibleActions.map((spec, idx) =>
      renderOneAction(source, row, spec, idx)
    )
  );
}

function renderOneAction(
  source: string,
  row: Record<string, unknown>,
  spec: RowActionSpec,
  idx: number
): ReactNode {
  const { props } = spec;
  const id = row.id;
  if (id == null) return null;

  const onPress = () => {
    if (props.action === "transition") {
      if (!props.machine_name || !props.target_state) {
        console.warn(
          `[termin-spectrum] transition action "${props.label}" ` +
            "missing machine_name or target_state"
        );
        return;
      }
      action({
        kind: "transition",
        content: source,
        id: id as string | number,
        machine_name: props.machine_name,
        target_state: props.target_state,
      }).then((result) => {
        if (!result.ok) {
          console.warn(
            `[termin-spectrum] transition '${props.target_state}' failed:`,
            result.error
          );
        }
      });
    } else if (props.action === "delete") {
      action({
        kind: "delete",
        content: source,
        id: id as string | number,
      }).then((result) => {
        if (!result.ok) {
          console.warn(
            "[termin-spectrum] delete failed:",
            result.error
          );
        }
      });
    } else if (props.action === "edit") {
      // Edit modal lands with the form contract — for v0.1.x of the
      // data-table renderer, log and skip. Button still renders so
      // the visual layout matches the SSR pipeline.
      console.log(
        "[termin-spectrum] edit action — not yet implemented in v0.1.x"
      );
    } else {
      console.warn(
        `[termin-spectrum] unknown action kind: ${props.action}`
      );
    }
  };

  return createElement(
    ActionButton,
    {
      key: idx,
      onPress,
      "data-termin-action": props.action,
      "data-termin-action-label": props.label,
    } as any,
    props.label
  );
}

registerLocal("presentation-base.data-table", renderDataTable);
