import Fastify from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CustomerPickerQuery, Role } from "@elkatech/contracts";
import {
  customerPickerQueryString,
  registerCustomerPickerRoute,
} from "./customer-picker";

const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function appFor(role: Role | null, fetchCustomerPage = vi.fn()) {
  const app = Fastify();
  apps.push(app);
  await registerCustomerPickerRoute(app, {
    requireSession: async (_request, reply, roles) => {
      if (!role) {
        (reply as { code: (status: number) => { send: (body: unknown) => void } })
          .code(401)
          .send({ message: "Unauthorized" });
        return null;
      }
      if (!roles.includes(role)) {
        (reply as { code: (status: number) => { send: (body: unknown) => void } })
          .code(403)
          .send({ message: "Forbidden" });
        return null;
      }
      return { user: { role } };
    },
    forbidden: (reply) =>
      (reply as { code: (status: number) => { send: (body: unknown) => unknown } })
        .code(403)
        .send({ message: "Forbidden" }),
    fetchCustomerPage,
    forwardError: (_request, reply) =>
      (reply as { code: (status: number) => { send: (body: unknown) => unknown } })
        .code(502)
        .send({ message: "Customer search failed." }),
  });
  await app.ready();
  return app;
}

describe("customer picker gateway", () => {
  it.each(["admin", "owner"] as const)("allows %s to search a bounded page", async (role) => {
    const fetchCustomerPage = vi.fn(async () => ({ customers: [], nextCursor: null }));
    const app = await appFor(role, fetchCustomerPage);

    const response = await app.inject({
      method: "GET",
      url: "/api/admin/customer-picker?search=Kush&limit=15",
    });

    expect(response.statusCode).toBe(200);
    expect(fetchCustomerPage).toHaveBeenCalledWith({
      search: "Kush",
      limit: 15,
    });
  });

  it.each(["support", "engineer", "customer"] as const)(
    "rejects %s without querying customer data",
    async (role) => {
      const fetchCustomerPage = vi.fn();
      const app = await appFor(role, fetchCustomerPage);
      const response = await app.inject({
        method: "GET",
        url: "/api/admin/customer-picker?search=Ku",
      });
      expect(response.statusCode).toBe(403);
      expect(fetchCustomerPage).not.toHaveBeenCalled();
    },
  );

  it("returns 401 when unauthenticated", async () => {
    const app = await appFor(null);
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/customer-picker?search=Ku",
    });
    expect(response.statusCode).toBe(401);
  });

  it("rejects short searches before calling auth", async () => {
    const fetchCustomerPage = vi.fn();
    const app = await appFor("admin", fetchCustomerPage);
    const response = await app.inject({
      method: "GET",
      url: "/api/admin/customer-picker?search=K",
    });
    expect(response.statusCode).toBe(400);
    expect(fetchCustomerPage).not.toHaveBeenCalled();
  });
});

describe("customerPickerQueryString", () => {
  it("forwards only bounded picker parameters", () => {
    const query: CustomerPickerQuery = {
      search: "VJ Enterprise",
      limit: 15,
      cursor: "next-page",
    };
    expect(customerPickerQueryString(query)).toBe(
      "limit=15&search=VJ+Enterprise&cursor=next-page",
    );
  });
});
