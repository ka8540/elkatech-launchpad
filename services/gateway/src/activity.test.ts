import { describe, expect, it } from "vitest";
import type { Role } from "@elkatech/contracts";
import {
  EMPTY_REL,
  canAccessActivityDirectory,
  canAccessPersonPage,
  derivePersonState,
  emptyWorkload,
  headlineCounts,
  whitelistEventDetails,
  type PersonWorkload,
  type RelCounts,
} from "./activity";

const ALL_ROLES: Role[] = ["customer", "engineer", "support", "owner", "admin"];

function rel(overrides: Partial<RelCounts> = {}): RelCounts {
  return { ...EMPTY_REL, ...overrides };
}

function work(overrides: Partial<PersonWorkload> = {}): PersonWorkload {
  return { ...emptyWorkload(), ...overrides };
}

describe("activity console RBAC", () => {
  it("allows only admin, owner and support into the people directory", () => {
    const allowed = ALL_ROLES.filter(canAccessActivityDirectory);
    expect(allowed).toEqual(["support", "owner", "admin"]);
  });

  it("keeps engineers and customers out of the directory", () => {
    expect(canAccessActivityDirectory("engineer")).toBe(false);
    expect(canAccessActivityDirectory("customer")).toBe(false);
  });

  it("lets an engineer open only their own person page", () => {
    expect(canAccessPersonPage("engineer", "eng-1", "eng-1")).toBe(true);
    expect(canAccessPersonPage("engineer", "eng-1", "eng-2")).toBe(false);
    expect(canAccessPersonPage("engineer", "eng-1", "customer-9")).toBe(false);
  });

  it("never lets a customer open any person page, including their own", () => {
    expect(canAccessPersonPage("customer", "cust-1", "cust-1")).toBe(false);
    expect(canAccessPersonPage("customer", "cust-1", "eng-1")).toBe(false);
  });

  it("lets staff open anyone's page", () => {
    for (const role of ["support", "owner", "admin"] as Role[]) {
      expect(canAccessPersonPage(role, "staff-1", "someone-else")).toBe(true);
    }
  });
});

describe("derivePersonState", () => {
  const approvedEngineer = { role: "engineer" as Role, approvalStatus: "approved" as const };

  it("puts account state ahead of workload", () => {
    const busy = work({ engineer: rel({ inProgress: 3 }) });
    expect(
      derivePersonState({ role: "engineer", approvalStatus: "suspended" }, busy),
    ).toEqual({ state: "suspended", count: 0 });
    expect(
      derivePersonState({ role: "engineer", approvalStatus: "pending_approval" }, busy),
    ).toEqual({ state: "pending_approval", count: 0 });
    expect(
      derivePersonState({ role: "engineer", approvalStatus: "rejected" }, busy),
    ).toEqual({ state: "rejected", count: 0 });
  });

  it("reports in-progress work as `working` with its count", () => {
    expect(derivePersonState(approvedEngineer, work({ engineer: rel({ inProgress: 3 }) }))).toEqual({
      state: "working",
      count: 3,
    });
  });

  it("distinguishes accepted-but-not-started work from active work", () => {
    expect(derivePersonState(approvedEngineer, work({ engineer: rel({ pending: 2 }) }))).toEqual({
      state: "assignments_pending",
      count: 2,
    });
  });

  it("prefers in-progress over pending over waiting", () => {
    const all = work({ engineer: rel({ inProgress: 1, pending: 5, waiting: 9 }) });
    expect(derivePersonState(approvedEngineer, all).state).toBe("working");

    const noActive = work({ engineer: rel({ pending: 5, waiting: 9 }) });
    expect(derivePersonState(approvedEngineer, noActive).state).toBe("assignments_pending");

    const onlyWaiting = work({ engineer: rel({ waiting: 9 }) });
    expect(derivePersonState(approvedEngineer, onlyWaiting)).toEqual({
      state: "waiting_on_customer",
      count: 9,
    });
  });

  it("uses owned requests for a customer", () => {
    expect(
      derivePersonState(
        { role: "customer", approvalStatus: "approved" },
        work({ customer: rel({ open: 2 }) }),
      ),
    ).toEqual({ state: "open_requests", count: 2 });
  });

  it("uses filed requests for coordinating roles that own no queue", () => {
    for (const role of ["support", "owner", "admin"] as Role[]) {
      expect(
        derivePersonState({ role, approvalStatus: "approved" }, work({ creator: rel({ open: 4 }) })),
      ).toEqual({ state: "open_requests", count: 4 });
    }
  });

  it("does not credit a customer's own filings twice", () => {
    // A customer appears under both `customer` and `creator`; the customer
    // branch must win so the count is not doubled or read from the wrong rel.
    const both = work({ customer: rel({ open: 2 }), creator: rel({ open: 2 }) });
    expect(derivePersonState({ role: "customer", approvalStatus: "approved" }, both)).toEqual({
      state: "open_requests",
      count: 2,
    });
  });

  it("falls back to no active work, never to a bare number", () => {
    expect(derivePersonState(approvedEngineer, work())).toEqual({
      state: "no_active_work",
      count: 0,
    });
  });
});

describe("headlineCounts", () => {
  const w = work({
    engineer: rel({ open: 1, completed: 2 }),
    customer: rel({ open: 3, completed: 4 }),
    creator: rel({ open: 5, completed: 6 }),
  });

  it("resolves the Open/Completed columns against the person's role", () => {
    expect(headlineCounts("engineer", w)).toEqual({ open: 1, completed: 2 });
    expect(headlineCounts("customer", w)).toEqual({ open: 3, completed: 4 });
    for (const role of ["support", "owner", "admin"] as Role[]) {
      expect(headlineCounts(role, w)).toEqual({ open: 5, completed: 6 });
    }
  });

  it("returns zeroes rather than undefined for a person with no work", () => {
    expect(headlineCounts("engineer", work())).toEqual({ open: 0, completed: 0 });
  });
});

describe("whitelistEventDetails", () => {
  const resolve = (id: string) => (id === "eng-1" ? "John Smith" : null);

  it("keeps only the whitelisted keys", () => {
    const details = whitelistEventDetails(
      {
        from: "waiting_for_customer",
        to: "in_progress",
        engineerId: "eng-1",
        previousEngineerId: "eng-0",
        visibility: "internal_note",
        fields: ["subject", "description"],
        issueType: "ink_issue",
        kind: "image",
      },
      resolve,
    );
    expect(details.from).toBe("waiting_for_customer");
    expect(details.to).toBe("in_progress");
    expect(details.engineerName).toBe("John Smith");
    expect(details.attachmentKind).toBe("image");
    expect(details.fields).toEqual(["subject", "description"]);
  });

  it("drops free-text and object-key metadata that must never be exposed", () => {
    const details = whitelistEventDetails(
      {
        to: "closed",
        reason: "customer said the machine caught fire",
        body: "internal note body",
        objectKey: "service-requests/abc/secret.png",
        internalSerialNumber: "SN-12345",
        url: "https://r2.example/signed",
      },
      resolve,
    );
    const serialised = JSON.stringify(details);
    expect(serialised).not.toContain("caught fire");
    expect(serialised).not.toContain("internal note body");
    expect(serialised).not.toContain("secret.png");
    expect(serialised).not.toContain("SN-12345");
    expect(serialised).not.toContain("r2.example");
    expect(details.to).toBe("closed");
  });

  it("renders an unresolvable actor as null so the UI can show `Removed user`", () => {
    const details = whitelistEventDetails({ engineerId: "ghost" }, resolve);
    expect(details.engineerId).toBe("ghost");
    expect(details.engineerName).toBeNull();
  });

  it("tolerates missing, null and malformed metadata", () => {
    for (const input of [null, undefined, {}, { fields: "not-an-array" }, { from: 42 }]) {
      const details = whitelistEventDetails(input, resolve);
      expect(details.engineerName).toBeNull();
      expect(details.from).toBeNull();
    }
    expect(whitelistEventDetails({ fields: ["ok", 7, null] }, resolve).fields).toEqual(["ok"]);
  });
});
