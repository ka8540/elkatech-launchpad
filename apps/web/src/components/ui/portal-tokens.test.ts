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
  "popover.tsx",
  "drawer.tsx",
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

  /**
   * The shadcn primitives paint `bg-background` / `bg-popover`, not
   * `var(--lp-panel)`. Unless the dark portal scopes re-point those tokens at
   * the graphite family, they fall through to the global `.dark` palette,
   * which is the blue product/marketing navy — that is how the Account
   * details drawer shipped as a navy panel floating over a charcoal page.
   */
  it("the dark portal scopes re-point the shadcn surfaces onto neutral charcoal", () => {
    const css = readFileSync(path.join(__dirname, "../../index.css"), "utf8");

    for (const scope of [".dark .lp {", ".dark .lp-portal {"]) {
      const start = css.indexOf(scope);
      expect(start, `${scope} must exist`).toBeGreaterThan(-1);
      const block = css.slice(start, css.indexOf("\n  }", start));

      for (const token of ["--background", "--card", "--popover", "--muted", "--border"]) {
        const declared = new RegExp(`${token}:\\s*(\\d+) (\\d+)% (\\d+)%`).exec(block);
        expect(declared, `${scope} must declare ${token}`).not.toBeNull();
        // Neutral charcoal: low saturation. The navy tokens it replaces sit at
        // 40–60%, so anything above ~20% means the blue tint crept back in.
        expect(Number(declared![2]), `${scope} ${token} must stay desaturated`).toBeLessThanOrEqual(20);
      }
    }
  });

  it("light mode keeps the untouched shadcn palette", () => {
    const css = readFileSync(path.join(__dirname, "../../index.css"), "utf8");

    for (const scope of ["\n  .lp {", "\n  .lp-portal {"]) {
      const start = css.indexOf(scope);
      expect(start, `${scope} must exist`).toBeGreaterThan(-1);
      const block = css.slice(start, css.indexOf("\n  }", start));
      // The light scopes re-point accent/ring onto copper and nothing else;
      // surfaces stay on the global light palette.
      expect(block).not.toContain("--background:");
      expect(block).not.toContain("--card:");
      expect(block).not.toContain("--popover:");
    }
  });
});
