import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The graphite/copper design tokens are declared on `.lp`, `.dark .lp`,
 * `.lp-portal` and `.dark .lp-portal` — never globally. Radix portals render
 * their content on `document.body`, OUTSIDE the `.lp` subtree, so any portaled
 * surface must carry `lp-portal` or every `var(--lp-*)` resolves to invalid:
 * `border-color` silently falls back to `currentColor` (near-black) and
 * backgrounds disappear. That is exactly how the account actions menu shipped
 * looking like an unstyled box with a heavy black outline.
 *
 * Asserting on the source keeps this from regressing: jsdom does not resolve
 * cascaded custom properties, so a runtime check could not catch it.
 */
const PORTALED_PRIMITIVES = [
  "dialog.tsx",
  "alert-dialog.tsx",
  "dropdown-menu.tsx",
  "select.tsx",
  "sheet.tsx",
];

function read(file: string): string {
  return readFileSync(path.join(__dirname, file), "utf8");
}

describe("portaled UI primitives carry the lp-portal token scope", () => {
  for (const file of PORTALED_PRIMITIVES) {
    it(`${file} applies lp-portal to its portaled content`, () => {
      expect(read(file)).toContain("lp-portal");
    });
  }

  it("the tokens really are scoped, not global — which is why this matters", () => {
    const css = readFileSync(path.join(__dirname, "../../index.css"), "utf8");
    // Declared under .lp / .lp-portal…
    expect(css).toMatch(/\.lp\s*\{[^}]*--lp-panel:/);
    expect(css).toMatch(/\.lp-portal\s*\{[^}]*--lp-panel:/);
    // …and deliberately NOT on :root, so portals cannot inherit them.
    const rootBlock = css.slice(css.indexOf(":root {"), css.indexOf("}", css.indexOf(":root {")));
    expect(rootBlock).not.toContain("--lp-panel:");
  });
});
