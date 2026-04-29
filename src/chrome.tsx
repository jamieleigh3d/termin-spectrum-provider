// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// Page chrome — app header with nav links, role switcher, username
// entry. Mirrors the SSR-Tailwind shell (termin_runtime/presentation.py
// `_NAV_TEMPLATE` / `build_base_template`).
//
// The chrome data lives at `bootstrap.app_chrome` per the runtime's
// `_build_app_chrome` helper. Three pieces:
//   - nav_items[]      — already filtered by principal role, ready to
//                        render. Click → Termin.navigate(/<slug>).
//   - role select      — POST to /set-role on change, page reload.
//                        Anonymous + every declared role appear as
//                        options.
//   - username entry   — visible only when not anonymous; POST to
//                        /set-role with `user_name` on blur.

import { ReactElement, ReactNode, createElement, useState } from "react";
import {
  ActionButton,
  ActionButtonGroup,
  Picker,
  PickerItem,
  TextField,
} from "@react-spectrum/s2";

export interface AppChrome {
  app_name: string;
  nav_items: Array<{
    label: string;
    page_slug: string;
    badge_content?: string | null;
  }>;
  available_roles: string[];
  current_role: string;
  current_user_name: string;
  is_anonymous: boolean;
}

interface ChromeProps {
  chrome: AppChrome;
  children: ReactNode;
}

/** Submit a /set-role POST and reload. Used by both the role picker
 *  and the username field on blur. The endpoint sets termin_role
 *  and termin_user_name cookies and 303s to /; we follow with a
 *  manual reload of the current path so the user lands where they
 *  were rather than on the home page. */
function postSetRole(role: string, userName: string): void {
  const form = new FormData();
  form.set("role", role);
  if (userName) form.set("user_name", userName);
  fetch("/set-role", {
    method: "POST",
    body: form,
    credentials: "same-origin",
    redirect: "manual",
  }).finally(() => {
    // Reload to pick up the new cookie state. The runtime now does a
    // permissive role lookup (single-variant slugs return their page
    // regardless of the user's role), so reloading keeps the user on
    // the same path even if the new role doesn't have an exact match.
    window.location.reload();
  });
}

export function PageChrome({ chrome, children }: ChromeProps): ReactElement {
  const [userName, setUserName] = useState(chrome.current_user_name);

  const handleRoleChange = (key: React.Key) => {
    postSetRole(String(key), userName);
  };
  const handleNameBlur = () => {
    if (userName !== chrome.current_user_name) {
      postSetRole(chrome.current_role, userName);
    }
  };

  const navItems = chrome.nav_items.map((item) =>
    createElement(
      ActionButton,
      {
        key: item.page_slug,
        // Spectrum's ActionButton treats `isQuiet` as a flat-look
        // variant suitable for nav. The default look would be too
        // visually heavy for a header.
        isQuiet: true,
        onPress: () => {
          // Use Termin.navigate so the bundle re-renders without a
          // full page reload. Falls back to assigning location for
          // safety if the global is unavailable (shouldn't happen).
          if (window.Termin?.navigate) {
            window.Termin.navigate(`/${item.page_slug}`).catch(() => {
              window.location.href = `/${item.page_slug}`;
            });
          } else {
            window.location.href = `/${item.page_slug}`;
          }
        },
      } as Record<string, unknown>,
      item.label
    )
  );

  const roleOptions = chrome.available_roles.map((r) =>
    createElement(PickerItem, { key: r, id: r }, r)
  );

  return createElement(
    "div",
    {
      "data-termin-chrome": "",
      style: {
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      },
    },
    createElement(
      "header",
      {
        key: "__header__",
        "data-termin-chrome-header": "",
        style: {
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 24px",
          borderBottom: "1px solid var(--s-color-border, #d0d0d0)",
          background: "light-dark(rgb(255,255,255), rgb(34,34,34))",
        },
      },
      createElement(
        "span",
        {
          key: "__app__",
          style: {
            fontWeight: 600,
            fontSize: "16px",
            color: "var(--spectrum-accent-color-900, #2680eb)",
            marginRight: "8px",
          },
        },
        chrome.app_name
      ),
      navItems.length > 0
        ? createElement(
            ActionButtonGroup,
            {
              key: "__nav__",
              "aria-label": "Navigation",
              density: "compact",
            } as Record<string, unknown>,
            ...navItems
          )
        : null,
      createElement("div", { key: "__spacer__", style: { flex: 1 } }),
      createElement(
        "div",
        {
          key: "__role__",
          "data-termin-role-switcher": "",
          style: {
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "200px",
          },
        },
        createElement(
          Picker,
          {
            "aria-label": "Role",
            selectedKey: chrome.current_role || null,
            onSelectionChange: handleRoleChange,
            // Compact size so the picker doesn't dominate the header.
            size: "S",
          } as Record<string, unknown>,
          ...roleOptions
        )
      ),
      !chrome.is_anonymous
        ? createElement(
            "div",
            {
              key: "__name__",
              "data-termin-user-name-entry": "",
              style: { width: "180px" },
            },
            createElement(TextField, {
              "aria-label": "Display name",
              value: userName,
              onChange: (v: string) => setUserName(v),
              onBlur: handleNameBlur,
              size: "S",
            } as Record<string, unknown>)
          )
        : null
    ),
    createElement(
      "main",
      {
        key: "__main__",
        "data-termin-chrome-main": "",
        style: {
          flex: 1,
          padding: "24px",
        },
      },
      children
    )
  );
}
