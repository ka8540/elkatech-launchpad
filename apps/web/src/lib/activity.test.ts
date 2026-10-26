import { describe, expect, it } from "vitest";
import type { ActivityEvent, ActivityPersonRow, Role } from "@elkatech/contracts";
import {
  REMOVED_USER_LABEL,
  TAB_EVENT_TYPES,
  describeCurrentWork,
  describeEvent,
  personMetrics,
  personName,
  tabsForRole,
} from "./activity";

function event(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "evt-1",
    occurredAt: "2026-06-11T18:44:08.236Z",
    eventType: "request_created",
    recordedRole: "customer",
    actorId: "actor-1",
    request: {
      id: "req-1",
      requestNumber: "SRV-1",
      subject: "Ink issue",
      status: "new",
      customerId: "cust-1",
    },
    details: {
      from: null,
      to: null,
      engineerId: null,
      engineerName: null,
      previousEngineerId: null,
      previousEngineerName: null,
      visibility: null,
      fields: null,
      issueType: null,
      attachmentKind: null,
    },
    ...overrides,
  } as ActivityEvent;
}

function details(overrides: Partial<ActivityEvent["details"]>) {
  return { ...event().details, ...overrides };
}

describe("describeCurrentWork", () => {
  it("phrases live work with its count", () => {
    expect(describeCurrentWork("working", 3)).toBe("Working on 3 requests");
    expect(describeCurrentWork("working", 1)).toBe("Working on 1 request");
  });

  it("phrases pending assignments", () => {
    expect(describeCurrentWork("assignments_pending", 2)).toBe("2 assignments pending");
    expect(describeCurrentWork("assignments_pending", 1)).toBe("1 assignment pending");
  });

  it("phrases the remaining states without bare numbers", () => {
    expect(describeCurrentWork("waiting_on_customer", 0)).toBe("Waiting for customer");
    expect(describeCurrentWork("no_active_work", 0)).toBe("No active work");
    expect(describeCurrentWork("suspended", 0)).toBe("Suspended");
    expect(describeCurrentWork("pending_approval", 0)).toBe("Pending approval");
    expect(describeCurrentWork("open_requests", 1)).toBe("1 open request");
    expect(describeCurrentWork("open_requests", 4)).toBe("4 open requests");
  });
});

describe("describeEvent — human-readable actions", () => {
  it("never leaks a raw event identifier", () => {
    const types = [
      "request_created",
      "request_updated",
      "request_claimed",
      "request_assigned",
      "request_reassigned",
      "status_changed",
      "message_added",
      "attachment_added",
      "request_cancelled",
      "request_archived",
    ];
    for (const eventType of types) {
      const { label } = describeEvent(event({ eventType }));
      expect(label).not.toContain("_");
      expect(label).not.toBe(eventType);
      expect(label.length).toBeGreaterThan(0);
    }
  });

  it("names the engineer on assignment", () => {
    const described = describeEvent(
      event({
        eventType: "request_assigned",
        details: details({ engineerId: "e1", engineerName: "John Smith" }),
      }),
    );
    expect(described.label).toBe("Assigned request to John Smith");
    expect(described.next).toBe("John Smith");
  });

  it("names both engineers on reassignment", () => {
    const described = describeEvent(
      event({
        eventType: "request_reassigned",
        details: details({
          previousEngineerId: "e0",
          previousEngineerName: "Alex",
          engineerId: "e1",
          engineerName: "Priya",
        }),
      }),
    );
    expect(described.label).toBe("Reassigned request from Alex to Priya");
    expect(described.previous).toBe("Alex");
    expect(described.next).toBe("Priya");
  });

  it("translates a status change using readable status labels", () => {
    const described = describeEvent(
      event({
        eventType: "status_changed",
        details: details({ from: "waiting_for_customer", to: "in_progress" }),
      }),
    );
    expect(described.label).toBe("Changed status from Waiting to In Progress");
    expect(described.previous).toBe("Waiting");
    expect(described.next).toBe("In Progress");
  });

  it("distinguishes a customer message from an internal note", () => {
    expect(
      describeEvent(
        event({ eventType: "message_added", details: details({ visibility: "internal_note" }) }),
      ).label,
    ).toBe("Added an internal note");
    expect(
      describeEvent(
        event({
          eventType: "message_added",
          details: details({ visibility: "customer_visible" }),
        }),
      ).label,
    ).toBe("Added a customer message");
  });

  it("falls back to a removed-user label rather than dropping the name", () => {
    const described = describeEvent(
      event({
        eventType: "request_assigned",
        details: details({ engineerId: "ghost", engineerName: null }),
      }),
    );
    expect(described.label).toBe(`Assigned request to ${REMOVED_USER_LABEL}`);
  });

  it("humanises an unknown event type instead of showing the identifier", () => {
    const described = describeEvent(event({ eventType: "request_frobnicated" }));
    expect(described.label).toBe("Request frobnicated");
    expect(described.label).not.toContain("_");
  });

  it("uses the recorded role, never substituting a current role", () => {
    const recorded = event({ recordedRole: "engineer" });
    expect(recorded.recordedRole).toBe("engineer");
    // describeEvent must not read or invent a current role.
    expect(JSON.stringify(describeEvent(recorded))).not.toContain("engineer");
  });
});

describe("tabsForRole", () => {
  it("gives each role only the sections that make sense", () => {
    expect(tabsForRole("engineer").map((t) => t.label)).toEqual([
      "Overview",
      "Current Tasks",
      "Activity History",
    ]);
    expect(tabsForRole("customer").map((t) => t.label)).toEqual([
      "Overview",
      "Requests",
      "Machines",
      "Activity History",
    ]);
    expect(tabsForRole("support").map((t) => t.label)).toEqual([
      "Overview",
      "Service Activity",
      "Assignments",
      "Messages",
      "Activity History",
    ]);
    for (const role of ["owner", "admin"] as Role[]) {
      expect(tabsForRole(role).map((t) => t.label)).toEqual([
        "Overview",
        "Operations",
        "Activity History",
      ]);
    }
  });

  it("never gives a customer a task queue or an engineer a machines tab", () => {
    expect(tabsForRole("customer").map((t) => t.id)).not.toContain("tasks");
    expect(tabsForRole("engineer").map((t) => t.id)).not.toContain("machines");
  });

  it("backs every non-overview staff tab with a real event filter", () => {
    for (const tab of tabsForRole("support")) {
      if (tab.id === "overview" || tab.id === "history") continue;
      expect(TAB_EVENT_TYPES[tab.id]?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe("personName", () => {
  it("renders a missing name as the removed-user label", () => {
    expect(personName(null)).toBe(REMOVED_USER_LABEL);
    expect(personName("")).toBe(REMOVED_USER_LABEL);
    expect(personName("  ")).toBe(REMOVED_USER_LABEL);
    expect(personName("Kush")).toBe("Kush");
  });
});

describe("personMetrics", () => {
  const base = {
    total: 0,
    inProgress: 0,
    pending: 0,
    waiting: 0,
    open: 0,
    completed: 0,
    unassigned: 0,
    stale: 0,
  };

  function person(role: Role, overrides: Record<string, unknown> = {}): ActivityPersonRow {
    return {
      id: "p1",
      displayName: "P",
      email: "p@example.com",
      role,
      approvalStatus: "approved",
      accountOrigin: "admin_invite",
      companyName: null,
      profileCompleted: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastSeenAt: null,
      lastRecordedActivityAt: null,
      state: "no_active_work",
      stateCount: 0,
      open: 0,
      completed: 0,
      machineCount: 0,
      workload: {
        asEngineer: { ...base },
        asCustomer: { ...base },
        asCreator: { ...base },
        recordedEvents: 0,
        ...overrides,
      },
    } as ActivityPersonRow;
  }

  it("shows an engineer their queue metrics including stale work", () => {
    const metrics = personMetrics(
      person("engineer", { asEngineer: { ...base, inProgress: 2, pending: 1, waiting: 3, completed: 5, stale: 4 } }),
    );
    expect(metrics).toEqual([
      { label: "Active assignments", value: 3 },
      { label: "Waiting", value: 3 },
      { label: "Completed", value: 5 },
      { label: "Stale 7+ days", value: 4 },
    ]);
  });

  it("shows a customer their own request metrics", () => {
    const metrics = personMetrics(
      person("customer", { asCustomer: { ...base, open: 2, unassigned: 1, completed: 7 } }),
    );
    expect(metrics.map((m) => m.label)).toEqual([
      "Open requests",
      "Unassigned",
      "Completed",
      "Recorded actions",
    ]);
    expect(metrics[0].value).toBe(2);
  });

  it("shows coordinating roles what they filed", () => {
    for (const role of ["support", "owner", "admin"] as Role[]) {
      const metrics = personMetrics(
        person(role, { asCreator: { ...base, total: 9, open: 4, completed: 5 } }),
      );
      expect(metrics.map((m) => m.label)).toEqual([
        "Requests filed",
        "Still open",
        "Completed",
        "Recorded actions",
      ]);
      expect(metrics[0].value).toBe(9);
    }
  });
});
