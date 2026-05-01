// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.data-table — Spectrum 2's TableView with rows
// sourced from `bound_data[props.source]` and per-row action buttons
// dispatched through Termin.action().
//
// Scope of this slice (v0.1.x + v0.9.1 reactivity):
//   * Core columns + rows from props.columns + bound_data
//   * Row-action buttons for kinds: transition, delete
//   * Empty-state message when the source has no records
//   * Redacted-sentinel handling — render "—" with the
//     data-termin-redacted attribute so accessibility can pick it up
//   * **v0.9.1 reactivity** — subscribe to `content.<source>` for
//     created/updated/deleted pushes; merge into local state and
//     re-render. Recompute __visible_actions client-side per push
//     using bootstrap.transitions[source][machine] + identity.scopes,
//     so action buttons reflect the row's NEW state without a page
//     refresh. Closes the v0.1.0 placeholder
//     ("Re-fetch and re-render on push events for v0.1.0…").
//
// Deferred to follow-on slices:
//   * Inline-editable fields (props.inline_editable_fields) — needs
//     edit-mode UX + form submission flow
//   * Filter / search / highlight / subscribe modifiers (children) —
//     each is its own primitive
//   * Related child-table rendering (children[type=related]) —
//     composes with this primitive but is its own thing
//   * The `edit` action kind — opens an edit modal; deferred until
//     the form contract lands

import {
  ReactNode,
  ReactElement,
  createElement,
  Key,
  useState,
  useEffect,
  useMemo,
} from "react";
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
import { subscribe } from "../glue/subscribe";

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
  const initialRecords = lookupRecords(data, props.source);

  // The renderer is invoked through walk.tsx as a plain function; the
  // returned React element is a function component invocation, which
  // gives us access to hooks. The stateful component below owns row
  // state and subscribes to `content.<source>` pushes for live
  // updates — closing the v0.1.0 "render-once" placeholder.
  return createElement(DataTable, {
    source: props.source,
    columns: props.columns,
    rowActions: props.row_actions || [],
    initialRecords,
  });
}

interface DataTableInnerProps {
  source: string;
  columns: ColumnSpec[];
  rowActions: RowActionSpec[];
  initialRecords: Record<string, unknown>[];
}

function DataTable(p: DataTableInnerProps): ReactElement {
  const { source, columns, rowActions, initialRecords } = p;
  const hasActions = rowActions.length > 0;

  // Local row state, seeded from bound_data and updated in-place on
  // content.<source>.{created,updated,deleted} pushes. Identity-keyed
  // by `row.id`.
  const [records, setRecords] = useState<Record<string, unknown>[]>(initialRecords);

  // Subscribe to row-mutation pushes. Re-fires on `source` changes
  // (e.g., navigation between pages with different data-tables).
  useEffect(() => {
    if (!source) return undefined;
    const channelPrefix = `content.${source}`;
    const handler = (rawData: unknown, channel?: string) => {
      if (typeof channel !== "string") return;
      // Channel shape: content.<source>.<action>; action ∈
      // {created, updated, deleted}.
      const parts = channel.split(".");
      const eventAction = parts[2];
      if (!rawData || typeof rawData !== "object") return;
      const payload = rawData as Record<string, unknown>;

      if (eventAction === "created") {
        setRecords((prev) => {
          // Idempotent: if the id already exists, treat as update.
          if (payload.id != null && prev.some((r) => r.id === payload.id)) {
            return prev.map((r) => (r.id === payload.id ? { ...r, ...payload } : r));
          }
          return [...prev, payload];
        });
      } else if (eventAction === "updated") {
        if (payload.id == null) return;
        setRecords((prev) =>
          prev.map((r) => (r.id === payload.id ? { ...r, ...payload } : r))
        );
      } else if (eventAction === "deleted") {
        const id = (payload.record_id ?? payload.id) as
          | string
          | number
          | undefined;
        if (id == null) return;
        setRecords((prev) => prev.filter((r) => r.id !== id));
      }
    };
    const unsub = subscribe(channelPrefix, handler);
    return unsub;
  }, [source]);

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
  > = useMemo(
    () => [
      ...columns.map((c) => ({ ...c, id: c.field })),
      ...(hasActions
        ? [{
            field: ACTIONS_COLUMN_ID,
            id: ACTIONS_COLUMN_ID,
            label: "Actions",
            __actions: true as const,
          }]
        : []),
    ],
    [columns, hasActions]
  );

  // v0.9.1: client-side __visible_actions recompute. The runtime
  // pre-evaluates visibility at bootstrap (in
  // termin_server.bootstrap._attach_visible_actions) and stamps each
  // row in the initial bound_data; that value is correct only for
  // the initial state. Once a row mutates via WebSocket push the
  // server-side stamp is stale: a "draft → active" transition still
  // leaves __visible_actions = ["Activate"]. We recompute per render
  // using the same logic the bootstrap helper uses, but driven from
  // the row's CURRENT (post-mutation) state. The recomputation is
  // memoized over (records, source, rowActions) so it skips when
  // nothing changed.
  const recordsWithVisibility = useMemo(
    () =>
      records.map((row) => ({
        ...row,
        __visible_actions: computeVisibleActions(row, source, rowActions),
      })),
    [records, source, rowActions]
  );

  // Empty-state branch — TableView's renderEmptyState slot would also
  // work, but a plain message reads more cleanly when no rows ever
  // arrive (rather than "no results matching filter" semantics).
  if (recordsWithVisibility.length === 0) {
    return createElement(
      "div",
      {
        "data-termin-contract": "presentation-base.data-table",
        "data-termin-source": source,
        "data-termin-empty": "true",
        style: { padding: "24px", color: "var(--spectrum-gray-700, #666)" },
      },
      `No ${source} yet.`
    );
  }

  return createElement(
    "div",
    {
      "data-termin-contract": "presentation-base.data-table",
      "data-termin-source": source,
    },
    createElement(
      TableView,
      {
        "aria-label": `Table of ${source}`,
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
              minWidth: col.__actions ? 320 : 120,
            } as any,
            col.label
          )) as unknown as ReactNode
      ),
      createElement(
        TableBody,
        { items: recordsWithVisibility as Iterable<Record<string, unknown>> } as any,
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
                  ? renderRowActions(source, row, rowActions)
                  : renderCellValue(row[col.field])
              )) as unknown as ReactNode
          )) as unknown as ReactNode
      )
    )
  );
}

// ── __visible_actions recompute (client-side mirror of
// termin_server.bootstrap._visible_actions_for_row) ──

interface TerminGlobalState {
  bootstrap?: {
    transitions?: Record<
      string,
      Record<string, Record<string, string>>
    >;
  };
  identity?: { scopes?: string[] };
}

function _terminState(): TerminGlobalState | null {
  const w = window as unknown as { __termin?: { state?: TerminGlobalState } };
  return w.__termin?.state ?? null;
}

function computeVisibleActions(
  row: Record<string, unknown>,
  source: string,
  actions: RowActionSpec[]
): string[] {
  const tstate = _terminState();
  const transitionsForSource =
    tstate?.bootstrap?.transitions?.[source] || {};
  const userScopes = new Set<string>(tstate?.identity?.scopes || []);

  const visible: string[] = [];
  for (const a of actions) {
    const props = a.props;
    const label = props.label || "";
    const kind = props.action || "transition";

    if (kind === "delete" || kind === "edit") {
      const required = props.required_scope || "";
      if (!required || userScopes.has(required)) visible.push(label);
      continue;
    }

    if (kind === "transition") {
      const machine = props.machine_name || "";
      const target = props.target_state || "";
      // Read the row's CURRENT state from the column whose name is
      // the machine name itself (v0.9 single-column-per-machine).
      const currentState = String(row[machine] ?? "");
      const machineMap = transitionsForSource[machine] || {};
      const transKey = `${currentState}|${target}`;
      const requiredScope = machineMap[transKey];
      if (requiredScope === undefined) continue; // not a declared transition
      if (requiredScope === "" || userScopes.has(requiredScope)) {
        visible.push(label);
      }
      continue;
    }

    // Unknown action kind — show by default. Mirrors the
    // termin_server.bootstrap fallback; runtime gates dispatch.
    visible.push(label);
  }
  return visible;
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
