import type { FastifyReply, FastifyRequest } from "fastify";
import { getEnv } from "./env";

export function assertInternalRequest(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers["x-internal-token"];

  if (token !== getEnv().INTERNAL_SERVICE_TOKEN) {
    reply.code(401);
    throw new Error("Unauthorized internal service request");
  }
}
