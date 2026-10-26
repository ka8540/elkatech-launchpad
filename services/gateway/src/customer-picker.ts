import type { FastifyInstance } from "fastify";
import {
  canManageOperational,
  customerPickerQuerySchema,
  type CustomerPickerQuery,
  type Role,
} from "@elkatech/contracts";

type PickerSession = {
  user: {
    role: Role;
  };
};

export type CustomerPickerGatewayDeps = {
  requireSession: (
    request: unknown,
    reply: unknown,
    roles: Role[],
  ) => Promise<PickerSession | null>;
  forbidden: (reply: unknown) => unknown;
  fetchCustomerPage: (query: CustomerPickerQuery) => Promise<unknown>;
  forwardError: (request: unknown, reply: unknown, error: unknown) => unknown;
};

export function customerPickerQueryString(query: CustomerPickerQuery): string {
  const params = new URLSearchParams({ limit: String(query.limit) });
  if (query.search) params.set("search", query.search);
  if (query.customerId) params.set("customerId", query.customerId);
  if (query.cursor) params.set("cursor", query.cursor);
  return params.toString();
}

export async function registerCustomerPickerRoute(
  app: FastifyInstance,
  deps: CustomerPickerGatewayDeps,
) {
  app.get("/api/admin/customer-picker", async (request, reply) => {
    const session = await deps.requireSession(request, reply, ["admin", "owner"]);
    if (!session) return;
    if (!canManageOperational(session.user.role)) return deps.forbidden(reply);

    const parsed = customerPickerQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ message: "Enter at least 2 characters to search." });
    }

    try {
      return await deps.fetchCustomerPage(parsed.data);
    } catch (error) {
      return deps.forwardError(request, reply, error);
    }
  });
}
