import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.join(__dirname, "../index.css"), "utf8");
const input = readFileSync(path.join(__dirname, "../components/ui/input.tsx"), "utf8");
const textarea = readFileSync(path.join(__dirname, "../components/ui/textarea.tsx"), "utf8");
const controls = [input, textarea];

describe("shared form-control value text", () => {
  it("resolves the foreground token on each control instead of inheriting body color", () => {
    for (const source of controls) {
      expect(source).toContain(" text-foreground caret-accent ");
      expect(source).toContain("[-webkit-text-fill-color:hsl(var(--foreground))]");
    }
  });

  it("keeps placeholder ink muted even when WebKit text fill is set", () => {
    for (const source of controls) {
      expect(source).toContain("placeholder:text-muted-foreground");
      expect(source).toContain(
        "placeholder:[-webkit-text-fill-color:hsl(var(--muted-foreground))]",
      );
      expect(source).toContain("placeholder:opacity-100");
    }
  });

  it("uses the scoped accent for a visible caret", () => {
    for (const source of controls) {
      expect(source).toContain("caret-accent");
    }
  });

  it("keeps disabled and read-only values distinguishable", () => {
    for (const source of controls) {
      expect(source).toContain("disabled:text-muted-foreground");
      expect(source).toContain(
        "disabled:[-webkit-text-fill-color:hsl(var(--muted-foreground))]",
      );
      expect(source).toContain("[&[readonly]]:bg-muted/50");
      expect(source).toContain("[&[readonly]]:text-muted-foreground");
      expect(source).toContain(
        "[&[readonly]]:[-webkit-text-fill-color:hsl(var(--muted-foreground))]",
      );
    }
  });

  it("does not customize selection colors", () => {
    expect(css).not.toContain("::selection");
  });
});

describe("browser autofill value text", () => {
  it("normalizes input, textarea, and select autofill ink", () => {
    expect(css).toMatch(/^input:-webkit-autofill,/m);
    expect(css).toMatch(/^textarea:-webkit-autofill,/m);
    expect(css).toMatch(/^select:-webkit-autofill:focus \{/m);

    const rule = css.slice(css.indexOf("input:-webkit-autofill,"));
    expect(rule).toContain("-webkit-text-fill-color: hsl(var(--foreground))");
    expect(rule).toContain("caret-color: hsl(var(--accent))");
  });

  it("preserves muted ink for autofilled disabled and read-only controls", () => {
    const rule = css.slice(css.indexOf("input:-webkit-autofill:disabled,"));
    expect(rule).toContain("input:-webkit-autofill[readonly]");
    expect(rule).toContain("textarea:-webkit-autofill[readonly]");
    expect(rule).toContain("-webkit-text-fill-color: hsl(var(--muted-foreground))");
  });

  it("keeps the Firefox autofill tint disabled", () => {
    expect(css).toContain("input:is(:autofill)");
    expect(css).toContain("textarea:is(:autofill)");
    expect(css).toContain("select:is(:autofill)");
  });
});
