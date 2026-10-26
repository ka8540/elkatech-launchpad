import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Structural guard for the write-plus-history transaction contract.
 *
 * Every domain write that records history must enlist the history insert in
 * the same transaction, by passing the `tx` executor as `addHistory`'s last
 * argument. Otherwise a rejected history insert leaves the domain write
 * committed while the endpoint returns 500 — the exact defect that let a
 * support-role assignment half-apply before migration 005.
 *
 * `src/index.ts` builds a Fastify app and opens a connection pool at module
 * scope, so it cannot be imported in a unit test. This asserts the invariant
 * against the source text instead. It verifies that call sites are enlisted —
 * it does NOT execute SQL and does not prove transactional behaviour at
 * runtime; that is covered by the migration/atomicity checks in the PR notes.
 */
const SOURCE = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "index.ts"),
  "utf8",
);

/** Extract the argument text of each `addHistory(...)` *call* (not the declaration). */
function addHistoryCallArgs(source: string): string[] {
  const calls: string[] = [];
  const needle = "addHistory(";
  let from = 0;

  for (;;) {
    const start = source.indexOf(needle, from);
    if (start === -1) break;
    from = start + needle.length;

    // Skip the function declaration itself.
    if (/async function\s+$/.test(source.slice(Math.max(0, start - 20), start))) continue;

    // Walk to the matching close paren.
    let depth = 1;
    let i = from;
    while (i < source.length && depth > 0) {
      const ch = source[i];
      if (ch === "(") depth += 1;
      else if (ch === ")") depth -= 1;
      i += 1;
    }
    calls.push(source.slice(from, i - 1));
  }

  return calls;
}

/** Last top-level argument of a call's argument text. Tolerates the trailing
 *  comma that Prettier leaves on multi-line argument lists. */
function lastArgument(args: string): string {
  const trimmed = args.trim().replace(/,$/, "");
  let depth = 0;
  for (let i = trimmed.length - 1; i >= 0; i -= 1) {
    const ch = trimmed[i];
    if (ch === ")" || ch === "}" || ch === "]") depth += 1;
    else if (ch === "(" || ch === "{" || ch === "[") depth -= 1;
    else if (ch === "," && depth === 0) return trimmed.slice(i + 1).trim();
  }
  return trimmed.trim();
}

describe("the guard itself detects a non-enlisted call", () => {
  // Proves the assertions below can actually fail, without mutating
  // production source to manufacture one.
  const FIXTURE = `
    await addHistory(id, actor, "enlisted_single", {}, tx);
    await addHistory(
      id,
      actor,
      "enlisted_multi",
      { from: a, to: b },
      tx,
    );
    await addHistory(id, actor, "not_enlisted", { fields: [1, 2] });
  `;

  it("flags exactly the call missing its executor", () => {
    const calls = addHistoryCallArgs(FIXTURE);
    expect(calls).toHaveLength(3);
    const notEnlisted = calls.filter((args) => lastArgument(args) !== "tx");
    expect(notEnlisted).toHaveLength(1);
    expect(notEnlisted[0]).toContain("not_enlisted");
  });

  it("is not fooled by commas inside object or array arguments", () => {
    const calls = addHistoryCallArgs(FIXTURE);
    expect(lastArgument(calls[0])).toBe("tx");
    expect(lastArgument(calls[1])).toBe("tx");
  });
});

describe("addHistory transaction enlistment", () => {
  const calls = addHistoryCallArgs(SOURCE);

  it("finds every addHistory call site", () => {
    // 9 write-plus-history workflows: 2x create, update, message, claim,
    // assign, status, cancel/archive, attachment.
    expect(calls).toHaveLength(9);
  });

  it("passes the transaction executor at every call site", () => {
    const notEnlisted = calls.filter((args) => lastArgument(args) !== "tx");
    expect(notEnlisted).toEqual([]);
  });

  it("opens a transaction for each write-plus-history workflow", () => {
    const begins = SOURCE.match(/sql\.begin\(async \(tx\) =>/g) ?? [];
    expect(begins).toHaveLength(9);
  });

  it("declares the history executor with a real type, never `any`", () => {
    expect(SOURCE).toContain("tx: DbExecutor = sql");
    expect(SOURCE).not.toMatch(/tx:\s*any/);
  });

  it("never leaves a bare `await sql`` ` write inside a transaction block", () => {
    // Inside a `sql.begin` callback every write must go through `tx`. A stray
    // `sql\`` would run on a separate pooled connection and escape the
    // transaction entirely.
    const blocks = SOURCE.split("sql.begin(async (tx) =>").slice(1);
    for (const block of blocks) {
      // Scan to the end of the callback body by brace depth.
      let depth = 0;
      let end = 0;
      for (let i = 0; i < block.length; i += 1) {
        if (block[i] === "{") depth += 1;
        else if (block[i] === "}") {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      const body = block.slice(0, end);
      // `sql.json(...)` is a value serialiser, not a query — it is safe.
      const strayWrites = body.match(/\bawait sql`/g) ?? [];
      expect(strayWrites).toEqual([]);
    }
  });
});
