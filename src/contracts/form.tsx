// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.form — Spectrum 2 Form with field_input children,
// submit dispatched through Termin.action({kind: "create", ...}).
//
// Scope of this slice (v0.1.x):
//   * input_type = text  → TextField
//   * input_type = number → NumberField
//   * input_type = currency → NumberField with currency formatOptions
//   * input_type = enum → Picker with options from props.enum_values
//   * input_type = state → Picker with options from props.all_states
//   * input_type = reference → Picker over bound_data[reference_content]
//   * Submit calls Termin.action({kind: "create", content: <target>, payload: <values>})
//   * On success, reload the page (after_save string is logged but not
//     parsed — that's a follow-on slice)
//
// Deferred to follow-on slices:
//   * Update mode (props.target with edit_id) — needs the data-table's
//     Edit action to dispatch to a form, which is itself deferred
//   * after_save navigation parsing (return to <page>, etc.)
//   * Validation feedback (required field markers, min/max enforcement
//     beyond Spectrum's built-in NumberField behavior)
//   * Reference-display columns (showing `name` instead of `id` in the
//     picker is partly there but not robust against missing data)

import { ReactElement, ReactNode, FormEvent, useState, createElement } from "react";
import {
  Form,
  TextField,
  NumberField,
  Picker,
  PickerItem,
  Button,
  ButtonGroup,
} from "@react-spectrum/s2";
import { registerLocal, ContractRendererArgs } from "../walk";
import { lookupRecords } from "../glue/data";
import { action } from "../glue/action";

interface FormProps {
  target: string;
  after_save?: string;
  submit_scope?: string;
}

interface FieldInputProps {
  field: string;
  label: string;
  input_type:
    | "text"
    | "number"
    | "currency"
    | "enum"
    | "state"
    | "reference"
    | string;
  required?: boolean;
  minimum?: number;
  maximum?: number;
  step?: string | number;
  enum_values?: string[];
  all_states?: string[];
  state_machine?: string;
  reference_content?: string;
  reference_display_col?: string;
  reference_unique_col?: string;
}

interface FieldNode {
  type: string;
  props: FieldInputProps;
}

export function renderForm(args: ContractRendererArgs): ReactElement {
  const { node, data } = args;
  const props = (node.props as unknown as FormProps) || { target: "" };
  const fields = ((node.children || []) as Array<{
    type: string;
    props: FieldInputProps;
  }>).filter((c) => c && c.type === "field_input");

  return createElement(SpectrumForm, {
    formProps: props,
    fields,
    boundData: data,
  });
}

interface SpectrumFormProps {
  formProps: FormProps;
  fields: FieldNode[];
  boundData: Record<string, unknown>;
}

function SpectrumForm({
  formProps,
  fields,
  boundData,
}: SpectrumFormProps): ReactElement {
  // Controlled state: one entry per field. Initialized with the field's
  // type-appropriate default (empty string for text/picker; null for
  // numbers so the Spectrum NumberField shows placeholder).
  const initialValues: Record<string, unknown> = {};
  for (const f of fields) {
    initialValues[f.props.field] =
      f.props.input_type === "number" || f.props.input_type === "currency"
        ? null
        : "";
  }
  const [values, setValues] = useState(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleChange = (field: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formProps.target) {
      console.warn("[termin-spectrum] form has no target content");
      return;
    }
    setSubmitting(true);
    setErrorMessage(null);
    try {
      // Drop empty / null values so the runtime applies field defaults.
      const payload: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(values)) {
        if (v === null || v === "") continue;
        payload[k] = v;
      }
      const result = await action({
        kind: "create",
        content: formProps.target,
        payload,
      });
      if (result.ok) {
        // v0.1.x: hard reload. Parsing `after_save` ("return to the
        // Inventory Dashboard" → which slug?) is a follow-on slice;
        // for now reload picks up any newly-created data via the
        // page's existing bootstrap path.
        if (formProps.after_save) {
          console.log("[termin-spectrum] form saved:", formProps.after_save);
        }
        window.location.reload();
      } else {
        setErrorMessage(result.error || "Save failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return createElement(
    "div",
    {
      "data-termin-contract": "presentation-base.form",
      "data-termin-target": formProps.target,
    },
    createElement(
      Form,
      { onSubmit: handleSubmit, validationBehavior: "native" } as Record<
        string,
        unknown
      >,
      ...fields.map((f) => renderField(f, values, boundData, handleChange)),
      errorMessage
        ? createElement(
            "div",
            {
              key: "__error__",
              role: "alert",
              style: {
                color: "var(--spectrum-negative-color, #d7373f)",
                marginTop: "8px",
              },
            },
            errorMessage
          )
        : null,
      createElement(
        ButtonGroup,
        { key: "__actions__" } as Record<string, unknown>,
        createElement(
          Button,
          {
            type: "submit",
            variant: "accent",
            isPending: submitting,
          } as Record<string, unknown>,
          "Save"
        )
      )
    )
  );
}

function renderField(
  fieldNode: FieldNode,
  values: Record<string, unknown>,
  boundData: Record<string, unknown>,
  onChange: (field: string, value: unknown) => void
): ReactNode {
  const { props } = fieldNode;
  const value = values[props.field];
  const key = props.field;

  switch (props.input_type) {
    case "text":
      return createElement(TextField, {
        key,
        label: props.label,
        name: props.field,
        value: (value as string) ?? "",
        isRequired: props.required ?? false,
        onChange: (v: string) => onChange(props.field, v),
      } as Record<string, unknown>);

    case "number":
    case "currency":
      return createElement(NumberField, {
        key,
        label: props.label,
        name: props.field,
        value: value === null ? undefined : (value as number),
        isRequired: props.required ?? false,
        minValue: props.minimum,
        maxValue: props.maximum,
        formatOptions:
          props.input_type === "currency"
            ? { style: "currency", currency: "USD" }
            : undefined,
        onChange: (v: number) => onChange(props.field, v),
      } as Record<string, unknown>);

    case "enum": {
      const options = props.enum_values || [];
      return createElement(
        Picker,
        {
          key,
          label: props.label,
          name: props.field,
          selectedKey: (value as string) || null,
          isRequired: props.required ?? false,
          onSelectionChange: (k: React.Key) =>
            onChange(props.field, String(k)),
        } as Record<string, unknown>,
        ...options.map((opt) =>
          createElement(PickerItem, { key: opt, id: opt }, opt)
        )
      );
    }

    case "state": {
      const states = props.all_states || [];
      return createElement(
        Picker,
        {
          key,
          label: props.label,
          name: props.field,
          selectedKey: (value as string) || null,
          isRequired: props.required ?? false,
          onSelectionChange: (k: React.Key) =>
            onChange(props.field, String(k)),
        } as Record<string, unknown>,
        ...states.map((s) =>
          createElement(PickerItem, { key: s, id: s }, s)
        )
      );
    }

    case "reference": {
      // Look up the referenced records from bound_data. The page's
      // bootstrap-payload builder (`_walk_for_sources_and_refs` in
      // termin_runtime/bootstrap.py) auto-includes referenced
      // content's records in bound_data when a form has a reference
      // field — so they should be there. If not, render an empty
      // picker; the user sees "no options" and can't submit.
      const sourceName = props.reference_content || "";
      const records = lookupRecords(boundData, sourceName);
      const displayCol = props.reference_display_col || "id";
      return createElement(
        Picker,
        {
          key,
          label: props.label,
          name: props.field,
          selectedKey: value == null ? null : String(value),
          isRequired: props.required ?? false,
          onSelectionChange: (k: React.Key) =>
            onChange(props.field, String(k)),
        } as Record<string, unknown>,
        ...records.map((rec) =>
          createElement(
            PickerItem,
            { key: String(rec.id), id: String(rec.id) },
            String((rec as Record<string, unknown>)[displayCol] ?? rec.id)
          )
        )
      );
    }

    default:
      // Unknown input type — render as text and warn so misconfigured
      // forms render *something* rather than crash.
      console.warn(
        `[termin-spectrum] unknown input_type "${props.input_type}" for field "${props.field}"; falling back to text`
      );
      return createElement(TextField, {
        key,
        label: props.label,
        name: props.field,
        value: (value as string) ?? "",
        isRequired: props.required ?? false,
        onChange: (v: string) => onChange(props.field, v),
      } as Record<string, unknown>);
  }
}

registerLocal("presentation-base.form", renderForm);
