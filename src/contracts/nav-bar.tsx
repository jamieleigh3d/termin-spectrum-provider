// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// presentation-base.nav-bar — top-level navigation links between pages.
//
// IR shape: the runtime emits `nav_items` at the top of the IR, not
// per-page. The bootstrap-payload builder (termin_runtime/bootstrap.py)
// could surface them but doesn't yet — for v0.1.x we render whatever
// the page tree carries via props.items, falling back to a placeholder
// when nothing's present.
//
// Each item: { label: string, page_slug: string, visible_to?: string[] }
// Click → Termin.navigate("/<page_slug>") for client-side routing.

import { ReactElement, createElement } from "react";
import { registerLocal, ContractRendererArgs } from "../walk";

interface NavItem {
  label: string;
  page_slug: string;
  visible_to?: string[];
}

interface NavBarProps {
  items?: NavItem[];
}

export function renderNavBar(args: ContractRendererArgs): ReactElement {
  const { node, principal } = args;
  const props = (node.props as unknown as NavBarProps) || {};
  const items = props.items || [];
  const userRole = (principal.id ?? "").toString();
  const userScopes = principal.scopes || [];
  // visible_to filtering — drop items whose role list doesn't include
  // the current user. For v0.1.x we permit everything when visible_to
  // isn't set; that matches the SSR pipeline's existing behavior.
  const visible = items.filter((it) => {
    if (!it.visible_to || it.visible_to.length === 0) return true;
    return it.visible_to.some((r) => userScopes.includes(r) || r === userRole);
  });
  return createElement(
    "nav",
    {
      "data-termin-contract": "presentation-base.nav-bar",
      style: {
        display: "flex",
        gap: "16px",
        padding: "8px 0",
        borderBottom:
          "1px solid light-dark(rgba(0,0,0,0.1), rgba(255,255,255,0.1))",
      },
    },
    ...visible.map((item) =>
      createElement(
        "a",
        {
          key: item.page_slug,
          href: `/${item.page_slug}`,
          onClick: (e: React.MouseEvent) => {
            // Honor the SPA navigation contract — Termin.navigate
            // is a no-reload page swap; fall back to default link
            // behavior if the global is missing.
            const T = (window as unknown as { Termin?: { navigate?: (p: string) => Promise<void> } }).Termin;
            if (T?.navigate) {
              e.preventDefault();
              T.navigate(`/${item.page_slug}`).catch(() => {
                window.location.href = `/${item.page_slug}`;
              });
            }
          },
          style: {
            color: "inherit",
            textDecoration: "none",
            padding: "4px 8px",
            borderRadius: "4px",
          },
        },
        item.label
      )
    )
  );
}

registerLocal("presentation-base.nav-bar", renderNavBar);
