// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.chat — scrolling message list + composer.
//
// The IR shape (from termin_runtime/presentation.py:_render_chat and
// termin/lower.py around line 836):
//   props.source            content name (e.g. "messages")
//   props.role_field        field name for the role (default "role")
//   props.content_field     field name for the message body
//                           (default "content"; agent_chatbot.termin
//                           uses "body")
//   children may include a `subscribe` modifier whose props.content
//   names the content to listen on (defaults to props.source)
//
// Wire-up:
//   * Persisted messages — subscribe to `content.<source>` for the
//     `created` action and append a real bubble. The `b9ffe3c` slice
//     wired the WebSocket → Termin.subscribe dispatch so this fires
//     on real push events in B' mode.
//   * Streaming tokens — subscribe to `compute.stream` and pin a
//     pending bubble per invocation_id. Both `text` and `tool_use`
//     streaming modes are handled per docs/termin-streaming-protocol.md;
//     for tool_use mode, only the field whose name matches
//     content_field is rendered. When a real `created` event arrives
//     for the same invocation, the pending bubble is replaced.
//   * Composer — TextField for input, Button for send. Submits via
//     Termin.action({kind: "create", content: source,
//     payload: {<role_field>: "user", <content_field>: text}}).
//
// Deferred (out of scope for this slice):
//   * Reaction/edit/delete affordances on past messages
//   * Typing indicators distinct from the pending-bubble mechanism
//   * Markdown rendering of message bodies (renders as plain text;
//     newlines preserved via white-space: pre-wrap)
//   * Optimistic local echo of the user's message before the server
//     confirms (today the bubble appears once content.<source>.created
//     fires)

import {
  ReactElement,
  ReactNode,
  createElement,
  useEffect,
  useRef,
  useState,
} from "react";
import type * as React from "react";
import { TextField, Button } from "@react-spectrum/s2";
import { registerLocal, ContractRendererArgs } from "../walk";
import { lookupRecords } from "../glue/data";
import { action } from "../glue/action";
import { subscribe } from "../glue/subscribe";

interface ChatProps {
  source: string;
  role_field?: string;
  content_field?: string;
}

interface Message {
  id: string | number;
  role: string;
  body: string;
}

interface PendingBubble {
  invocationId: string;
  role: string;
  body: string;
  resolved: boolean;
}

export function renderChat(args: ContractRendererArgs): ReactElement {
  const { node, data } = args;
  const props = (node.props as unknown as ChatProps) || { source: "" };
  const roleField = props.role_field || "role";
  const contentField = props.content_field || "content";

  const initialRecords = lookupRecords(data, props.source);
  const initialMessages: Message[] = initialRecords.map((rec) => {
    const r = rec as Record<string, unknown>;
    return {
      id: r.id as string | number,
      role: String(r[roleField] ?? "user"),
      body: String(r[contentField] ?? ""),
    };
  });

  return createElement(SpectrumChat, {
    source: props.source,
    roleField,
    contentField,
    initialMessages,
  });
}

interface SpectrumChatComponentProps {
  source: string;
  roleField: string;
  contentField: string;
  initialMessages: Message[];
}

function SpectrumChat({
  source,
  roleField,
  contentField,
  initialMessages,
}: SpectrumChatComponentProps): ReactElement {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [pending, setPending] = useState<Map<string, PendingBubble>>(
    () => new Map()
  );
  const [composerValue, setComposerValue] = useState("");
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages or pending bubbles change.
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, pending]);

  // Persisted message arrival — content.<source>.created
  useEffect(() => {
    if (!source) return undefined;
    const channelPrefix = `content.${source}`;
    const unsub = subscribe(channelPrefix, (rawData, channel) => {
      if (typeof channel !== "string") return;
      const parts = channel.split(".");
      const action = parts[2];
      if (action !== "created") return;
      if (!rawData || typeof rawData !== "object") return;
      const payload = rawData as Record<string, unknown>;
      const newMsg: Message = {
        id: payload.id as string | number,
        role: String(payload[roleField] ?? "user"),
        body: String(payload[contentField] ?? ""),
      };

      // Drop any pending bubble whose role matches — best-effort
      // single-pending-per-role heuristic. Streaming completion
      // typically lands the persisted message on the same role
      // (assistant) the pending bubble represented.
      setPending((prev) => {
        if (prev.size === 0) return prev;
        const next = new Map(prev);
        for (const [k, b] of next.entries()) {
          if (b.role === newMsg.role) {
            next.delete(k);
            break;
          }
        }
        return next;
      });

      setMessages((prev) => {
        // Idempotent: skip duplicates.
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    return unsub;
  }, [source, roleField, contentField]);

  // Streaming tokens — compute.stream.* per docs/termin-streaming-protocol.md
  useEffect(() => {
    const unsub = subscribe("compute.stream", (rawData) => {
      if (!rawData || typeof rawData !== "object") return;
      const payload = rawData as Record<string, unknown>;
      if (payload.error) {
        setErrorMessage(`Stream error: ${String(payload.error)}`);
        return;
      }
      const invId = payload.invocation_id;
      if (typeof invId !== "string") return;
      const mode = (payload.mode as string) || "text";

      if (mode === "tool_use") {
        // Only the field matching content_field renders into the bubble.
        if (payload.field !== contentField) return;
      }

      const delta = payload.delta as string | undefined;
      const done = payload.done as boolean | undefined;
      const finalText = payload.final_text as string | undefined;
      const toolValue = payload.value;

      setPending((prev) => {
        const next = new Map(prev);
        const existing = next.get(invId) ?? {
          invocationId: invId,
          // Streaming bubbles are currently always assistant — there's
          // no IR field that tells us the streamer's role. Convention:
          // streaming = the non-user side of the conversation.
          role: "assistant",
          body: "",
          resolved: false,
        };
        let body = existing.body;
        if (typeof delta === "string") body += delta;
        if (done) {
          if (mode === "tool_use" && toolValue !== undefined) {
            body = String(toolValue);
          } else if (typeof finalText === "string" && finalText !== body) {
            body = finalText;
          }
          existing.resolved = true;
        }
        next.set(invId, { ...existing, body });
        return next;
      });
    });
    return unsub;
  }, [contentField]);

  // No <form> element — the composer is a Spectrum TextField + Button
  // composition with the Button's onPress dispatching directly. Using
  // a real <form> introduced the risk of native form submission to the
  // current URL (the chat page route is GET-only, so submission lands
  // a 405 in the user's face whenever React's onSubmit wiring is
  // missed for any reason). The onPress + Enter-key handler combo gives
  // us the same UX without the footgun.
  const handleSend = async () => {
    const text = composerValue.trim();
    if (!text || !source) return;
    setSending(true);
    setErrorMessage(null);
    try {
      const result = await action({
        kind: "create",
        content: source,
        payload: {
          [roleField]: "user",
          [contentField]: text,
        },
      });
      if (result.ok) {
        setComposerValue("");
        // The created event will land via the content subscription
        // and append the bubble. No optimistic local insert — that's
        // a follow-on slice once we have a stable transient-message
        // model.
      } else {
        setErrorMessage(result.error || "Send failed");
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  };

  const pendingBubbles = Array.from(pending.values());

  return createElement(
    "div",
    {
      "data-termin-contract": "presentation-base.chat",
      "data-termin-source": source,
      "data-termin-content-field": contentField,
      style: {
        display: "flex",
        flexDirection: "column",
        height: "600px",
        border: "1px solid var(--s-color-border, #d0d0d0)",
        borderRadius: "8px",
        overflow: "hidden",
        background: "light-dark(rgb(255,255,255), rgb(34,34,34))",
      },
    },
    createElement(
      "div",
      {
        key: "__messages__",
        "data-termin-chat-messages": "",
        style: {
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        },
      },
      ...messages.map((m) => renderBubble(m, false)),
      ...pendingBubbles.map((p) => renderBubble(
        { id: p.invocationId, role: p.role, body: p.body || "…" },
        true
      )),
      createElement("div", { key: "__end__", ref: messagesEndRef })
    ),
    errorMessage
      ? createElement(
          "div",
          {
            key: "__error__",
            role: "alert",
            "data-termin-chat-stream-error": "",
            style: {
              padding: "8px 16px",
              color: "var(--spectrum-negative-color, #d7373f)",
              borderTop: "1px solid var(--s-color-border, #d0d0d0)",
              fontSize: "13px",
            },
          },
          errorMessage
        )
      : null,
    createElement(
      "div",
      {
        key: "__composer__",
        "data-termin-chat-form": "",
        role: "group",
        "aria-label": "Message composer",
        style: {
          display: "flex",
          gap: "8px",
          padding: "12px",
          borderTop: "1px solid var(--s-color-border, #d0d0d0)",
          alignItems: "end",
        },
      },
      createElement(
        "div",
        { key: "__input-wrap__", style: { flex: 1 } },
        createElement(TextField, {
          "aria-label": "Message",
          value: composerValue,
          onChange: (v: string) => setComposerValue(v),
          // Submit on Enter; respect Shift+Enter and IME composition
          // (composing === true during multi-keystroke characters).
          onKeyDown: (
            ev: React.KeyboardEvent<HTMLInputElement> & { nativeEvent?: { isComposing?: boolean } }
          ) => {
            const composing =
              (ev.nativeEvent && ev.nativeEvent.isComposing) === true;
            if (
              ev.key === "Enter" &&
              !ev.shiftKey &&
              !composing &&
              composerValue.trim() &&
              !sending
            ) {
              ev.preventDefault();
              void handleSend();
            }
          },
          isDisabled: sending,
        } as Record<string, unknown>)
      ),
      createElement(
        Button,
        {
          key: "__send__",
          variant: "accent",
          isPending: sending,
          isDisabled: !composerValue.trim() || !source,
          onPress: () => {
            void handleSend();
          },
        } as Record<string, unknown>,
        "Send"
      )
    )
  );
}

function renderBubble(
  msg: { id: string | number; role: string; body: string },
  isPending: boolean
): ReactNode {
  const isUser = msg.role === "user";
  return createElement(
    "div",
    {
      key: String(msg.id),
      "data-termin-chat-message": "",
      "data-termin-role": msg.role,
      ...(isPending ? { "data-termin-chat-pending": "" } : {}),
      style: {
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      },
    },
    createElement(
      "div",
      {
        style: {
          maxWidth: "70%",
          padding: "8px 14px",
          borderRadius: "12px",
          opacity: isPending ? 0.8 : 1,
          background: isUser
            ? "var(--spectrum-accent-color-900, #2680eb)"
            : "light-dark(rgb(235,235,235), rgb(60,60,60))",
          color: isUser
            ? "white"
            : "light-dark(rgb(34,34,34), rgb(229,229,229))",
        },
      },
      createElement(
        "div",
        {
          key: "__role__",
          style: {
            fontSize: "11px",
            opacity: 0.7,
            marginBottom: "2px",
          },
        },
        msg.role
      ),
      createElement(
        "div",
        {
          key: "__body__",
          ...(isPending ? { "data-termin-chat-pending-body": "" } : {}),
          style: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
        },
        msg.body
      )
    )
  );
}

registerLocal("presentation-base.chat", renderChat);
