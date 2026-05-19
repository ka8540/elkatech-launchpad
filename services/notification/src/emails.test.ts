import { describe, expect, it } from "vitest";
import { buildEmails } from "./emails";

const ADMIN = "admin@elkatech.local";

describe("buildEmails — account verification", () => {
  it("builds a verification email for a self-service signup", () => {
    const emails = buildEmails(
      "user.registered",
      {
        email: "new.user@example.com",
        displayName: "New User",
        role: "customer",
        invitation: false,
        verifyUrl: "http://127.0.0.1:8080/verify-email?token=abc123",
      },
      ADMIN,
    );

    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe("new.user@example.com");
    expect(emails[0].subject).toMatch(/verify/i);
    expect(emails[0].text).toContain("http://127.0.0.1:8080/verify-email?token=abc123");
  });

  it("builds an invitation email when the registration came from an invite", () => {
    const emails = buildEmails(
      "user.registered",
      {
        email: "engineer@example.com",
        displayName: "Eng",
        role: "engineer",
        invitation: true,
        inviteUrl: "http://127.0.0.1:8080/signup?inviteToken=tok",
      },
      ADMIN,
    );

    expect(emails).toHaveLength(1);
    expect(emails[0].to).toBe("engineer@example.com");
    expect(emails[0].subject).toMatch(/invited/i);
    expect(emails[0].text).toContain("http://127.0.0.1:8080/signup?inviteToken=tok");
  });
});

describe("buildEmails — service requests", () => {
  it("produces both the admin and customer emails for request.created", () => {
    const emails = buildEmails(
      "request.created",
      {
        requestNumber: "SR-1001",
        customerName: "Acme Co",
        customerEmail: "ops@acme.example",
        productName: "UV Printer",
        subject: "Printer jam",
      },
      ADMIN,
    );

    expect(emails).toHaveLength(2);
    expect(emails.map((email) => email.to)).toEqual([ADMIN, "ops@acme.example"]);
  });

  it("returns no emails for an unrecognised event type", () => {
    expect(buildEmails("user.something_else", {}, ADMIN)).toEqual([]);
  });
});
