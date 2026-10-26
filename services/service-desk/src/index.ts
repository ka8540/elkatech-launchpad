import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { z } from "zod";
import {
  adminLinkMachineInputSchema,
  adminMachineListQuerySchema,
  assignRequestInputSchema,
  cancelRequestInputSchema,
  catalogProductSchema,
  confirmAttachmentInputSchema,
  createCustomerMachineInputSchema,
  createCustomerRequestInputSchema,
  createRequestMessageInputSchema,
  createServiceRequestInputSchema,
  customerMachinePublicSchema,
  customerMachineSchema,
  ISSUE_TYPE_LABELS,
  issueTypeSchema,
  presignAttachmentInputSchema,
  requestAttachmentSchema,
  requestMessageSchema,
  requestStatusGroupSchema,
  requestStatusSchema,
  roleSchema,
  serviceRequestSchema,
  updateCustomerMachineInputSchema,
  updateServiceRequestInputSchema,
  updateRequestStatusInputSchema,
  canAssignRequests,
  canManageOperational,
  type Role,
} from "@elkatech/contracts";
import {
  attachmentKindFor,
  attachmentReadUrl,
  buildAttachmentObjectKey,
  fetchJson,
  getDb,
  getEnv,
  type DbExecutor,
  internalHeaders,
  InternalFetchError,
  isAllowedAttachmentType,
  isR2Configured,
  maxAttachmentBytes,
  presignAttachmentUpload,
} from "@elkatech/config";
import {
  canClaimRequest,
  canEditRequestDetails,
  canReplyToRequest,
  canTransitionRequestTo,
  canUpdateRequestStatus,
  canViewRequest,
  isValidStatusTransition,
  type WorkflowActor,
} from "./workflow";
import { registerReportRoutes } from "./reports";

const app = Fastify({ logger: true });
const sql = getDb();
const env = getEnv();

const userContextSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: roleSchema,
  displayName: z.string().min(1),
});

type UserContext = z.infer<typeof userContextSchema>;

function getUserContext(headers: Record<string, unknown>): UserContext {
  return userContextSchema.parse({
    id: headers["x-user-id"],
    email: headers["x-user-email"],
    role: headers["x-user-role"],
    displayName: headers["x-user-display-name"],
  });
}

function toWorkflowActor(actor: UserContext): WorkflowActor {
  return {
    id: actor.id,
    role: actor.role,
  };
}

function ensureInternal(headers: Record<string, unknown>) {
  return headers["x-internal-token"] === env.INTERNAL_SERVICE_TOKEN;
}

async function emitOutbox(eventType: string, aggregateId: string, payload: Record<string, unknown>) {
  await sql`
    insert into service_desk.outbox (id, aggregate_type, aggregate_id, event_type, payload)
    values (${randomUUID()}, ${"request"}, ${aggregateId}, ${eventType}, ${sql.json(payload as any)})
  `;
  // Kick the notification service to drain the outbox. Vercel suspends
  // serverless functions between requests, so the notification poller's
  // setInterval never runs in prod — without this ping, emails never go
  // out. Fire-and-forget so we never block or fail the user's request.
  triggerNotificationPoll();
}

function triggerNotificationPoll(): void {
  void fetch(`${env.NOTIFICATION_SERVICE_URL}/process-outbox`, {
    method: "POST",
    headers: internalHeaders(),
    // internalHeaders() sets Content-Type: application/json, so we must send a
    // (empty) JSON body — Fastify rejects an empty body with that content type
    // (FST_ERR_CTP_EMPTY_JSON_BODY).
    body: "{}",
  }).catch(() => {
    // Best-effort. The setInterval poller will catch up next time the
    // function happens to be warm, and the row stays in the outbox until
    // it's processed.
  });
}

async function addHistory(
  requestId: string,
  actor: UserContext,
  eventType: string,
  metadata: Record<string, unknown> = {},
  // Executor override so the history row can be enlisted in the caller's
  // transaction. Every domain write that records history must pass its `tx`,
  // otherwise a failed history insert leaves the domain write committed.
  // Defaults to the pooled client for standalone use.
  tx: DbExecutor = sql,
) {
  await tx`
    insert into service_desk.request_history (id, request_id, actor_id, actor_role, event_type, metadata)
    values (
      ${randomUUID()},
      ${requestId},
      ${actor.id},
      ${actor.role},
      ${eventType},
      ${sql.json(metadata as any)}
    )
  `;
}

function buildRequestNumber() {
  return `SRV-${Date.now().toString().slice(-8)}-${Math.floor(100 + Math.random() * 900)}`;
}

function statusBelongsToGroup(
  status: z.infer<typeof requestStatusSchema>,
  group: z.infer<typeof requestStatusGroupSchema>,
  actorRole: UserContext["role"],
) {
  if (group === "archived") return status === "closed";
  if (group === "resolved") return status === "resolved";
  if (group === "pending") return status === "waiting_for_customer";
  if (group === "in_progress") return status === "assigned" || status === "in_progress";
  if (group === "open") {
    return (
      status === "new" ||
      status === "triaged" ||
      (actorRole === "customer" && status === "waiting_for_customer")
    );
  }
  return status !== "closed";
}

function mapRequestRow(row: any) {
  return serviceRequestSchema.parse({
    id: row.id,
    requestNumber: row.request_number,
    customerId: row.customer_id,
    productId: row.product_id,
    productSnapshot: row.product_snapshot,
    customerMachineId: row.customer_machine_id ?? null,
    issueType: row.issue_type ?? null,
    subject: row.subject,
    description: row.description,
    contactPhone: row.contact_phone,
    siteLocation: row.site_location,
    serialNumber: row.serial_number,
    priority: row.priority,
    status: row.status,
    assignedEngineerId: row.assigned_engineer_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  });
}

function toDateString(value: unknown): string | null {
  if (!value) return null;
  // `date` columns come back as Date or "YYYY-MM-DD" depending on the driver;
  // normalise to a plain date string.
  try {
    return new Date(value as string).toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

/** Full machine record — admin/engineer view (includes internal serial). */
function mapMachineRow(row: any) {
  return customerMachineSchema.parse({
    id: row.id,
    customerId: row.customer_id,
    productId: row.product_id,
    productSnapshot: row.product_snapshot,
    displayLabel: row.display_label,
    unitNumber: row.unit_number,
    internalSerialNumber: row.internal_serial_number,
    siteName: row.site_name,
    siteLocation: row.site_location,
    contactPhone: row.contact_phone,
    purchaseDate: toDateString(row.purchase_date),
    installDate: toDateString(row.install_date),
    status: row.status,
    notes: row.notes,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  });
}

/** Customer-safe machine view — never exposes the internal serial or notes. */
function mapMachinePublic(row: any) {
  return customerMachinePublicSchema.parse({
    id: row.id,
    productId: row.product_id,
    productName: row.product_snapshot?.name ?? row.product_id,
    displayLabel: row.display_label,
    unitNumber: row.unit_number,
    siteName: row.site_name,
    siteLocation: row.site_location,
    contactPhone: row.contact_phone,
    status: row.status,
  });
}

async function getMachineById(machineId: string): Promise<any | null> {
  const rows = await sql<any[]>`
    select * from service_desk.customer_machines where id = ${machineId} limit 1
  `;
  return rows[0] ?? null;
}

/**
 * Validate that a customer can receive a machine assignment: the user must
 * exist, be a customer, and not be suspended/rejected (removed users are hard-
 * deleted, so a missing user surfaces as a 404 from getUserById). Returns an
 * error message string, or null when the customer is eligible.
 */
async function customerAssignmentError(customerId: string): Promise<string | null> {
  let user;
  try {
    user = await getUserById(customerId);
  } catch (error) {
    if (error instanceof InternalFetchError && error.status === 404) {
      return "Customer not found.";
    }
    throw error;
  }
  if (user.role !== "customer") {
    return "Machines can only be linked to customer accounts.";
  }
  const approval = (user as { approvalStatus?: string }).approvalStatus;
  if (approval === "suspended" || approval === "rejected") {
    return "Machines cannot be linked to a suspended or rejected customer.";
  }
  return null;
}

/** Insert a machine for a customer. Site location and contact phone default
 *  from the customer's saved profile when the admin doesn't override them, so
 *  admin never has to retype already-known contact details. Shared by the
 *  per-user route (customer in the URL) and the dashboard route (customer in
 *  the body). Returns the created row, or a user-facing error message. */
async function createMachineForCustomer(
  customerId: string,
  input: z.infer<typeof createCustomerMachineInputSchema>,
): Promise<{ row?: any; error?: string }> {
  let product;
  try {
    product = await getCatalogProduct(input.productId);
  } catch {
    return { error: "Unknown product." };
  }

  // Resolve site + phone: explicit override → customer profile default.
  let siteLocation = input.siteLocation?.trim() ?? "";
  let contactPhone = input.contactPhone?.trim() ?? "";
  if (!siteLocation || !contactPhone) {
    try {
      const { profile } = await getUserProfile(customerId);
      if (!siteLocation) siteLocation = addressSummary(profile);
      if (!contactPhone) contactPhone = profile?.contactPhone?.trim() ?? "";
    } catch {
      // Profile lookup failed — fall through to the missing-site guard below.
    }
  }
  if (!siteLocation) {
    return { error: "Add a customer address or enter a machine installation site." };
  }

  const productSnapshot = {
    id: product.id,
    categorySlug: product.categorySlug,
    slug: product.slug,
    name: product.name,
    priceDisplay: product.priceDisplay,
  };
  const unit = input.unitNumber?.trim();
  const displayLabel =
    input.displayLabel?.trim() || `${product.name}${unit ? ` — Unit ${unit}` : ""}`;

  const machineId = randomUUID();
  await sql`
    insert into service_desk.customer_machines (
      id, customer_id, product_id, product_snapshot, display_label, unit_number,
      internal_serial_number, site_name, site_location, contact_phone,
      purchase_date, install_date, status, notes
    )
    values (
      ${machineId},
      ${customerId},
      ${product.id},
      ${sql.json(productSnapshot as any)},
      ${displayLabel},
      ${unit || null},
      ${input.internalSerialNumber?.trim() || null},
      ${input.siteName?.trim() || null},
      ${siteLocation},
      ${contactPhone || null},
      ${input.purchaseDate?.trim() || null},
      ${input.installDate?.trim() || null},
      ${"active"},
      ${input.notes?.trim() || null}
    )
  `;
  const rows = await sql<any[]>`
    select * from service_desk.customer_machines where id = ${machineId} limit 1
  `;
  return { row: rows[0] };
}

async function getCatalogProduct(productId: string) {
  return fetchJson<z.infer<typeof catalogProductSchema>>(
    `${env.CATALOG_SERVICE_URL}/products/${productId}`,
    {
      headers: internalHeaders(),
    },
  );
}

async function getUserById(userId: string) {
  return fetchJson<{
    id: string;
    email: string;
    displayName: string;
    role: Role;
    emailVerified: boolean;
    createdAt: string;
  }>(`${env.AUTH_SERVICE_URL}/internal/users/${userId}`, {
    headers: internalHeaders(),
  });
}

type CustomerProfileLite = {
  displayName: string;
  companyName: string | null;
  contactPhone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
};

async function getUserProfile(userId: string) {
  return fetchJson<{
    user: { id: string; email: string; displayName: string };
    profile: CustomerProfileLite;
  }>(`${env.AUTH_SERVICE_URL}/internal/users/${userId}/profile`, {
    headers: internalHeaders(),
  });
}

/** A one-line site/location string from a customer's saved profile address.
 *  Used as the default machine installation site when the admin doesn't enter
 *  an explicit override. */
function addressSummary(profile: Partial<CustomerProfileLite> | null | undefined): string {
  if (!profile) return "";
  const cityState = [profile.city, profile.state].map((v) => v?.trim()).filter(Boolean).join(", ");
  return [profile.addressLine1?.trim(), cityState]
    .filter(Boolean)
    .join(", ")
    .trim();
}

/** Admin-only gate for customer-machine management. */
// Customer-machine management is an operational capability: admin and owner.
// (Support can view machines through the activity dashboard but does not reach
// these mutation/listing endpoints.) The gateway enforces the same set.
function ensureOperational(actor: UserContext, reply: any): boolean {
  if (!canManageOperational(actor.role)) {
    reply.code(403).send({ message: "Forbidden" });
    return false;
  }
  return true;
}

app.get("/health", async () => ({
  ok: true,
  service: "service-desk",
  environment: env.NODE_ENV,
}));

app.post("/requests", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const body = request.body as Record<string, unknown> | null;

  // ── Machine-based customer flow ──────────────────────────────────────────
  // The customer never types product / serial / location — they're derived
  // from the selected machine. Subject is auto-generated from issue + label.
  if (body && typeof body === "object" && "customerMachineId" in body) {
    const input = createCustomerRequestInputSchema.parse(body);
    const machine = await getMachineById(input.customerMachineId);
    if (!machine) {
      return reply.code(404).send({ message: "Machine not found." });
    }
    if (machine.status !== "active") {
      return reply.code(400).send({ message: "This machine is no longer active." });
    }
    // Ownership: a customer may only raise a request for their own machine.
    // Spoofing another customer's machine id is rejected here, server-side.
    if (actor.role === "customer" && machine.customer_id !== actor.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }
    // Admin-on-behalf: when a target customer is named, the machine must
    // actually belong to them (guards against a mismatched selection).
    if (input.customerId && machine.customer_id !== input.customerId) {
      return reply.code(400).send({ message: "This machine does not belong to that customer." });
    }

    const ownerId: string = machine.customer_id;
    let ownerEmail = actor.email;
    if (ownerId !== actor.id) {
      try {
        const owner = await getUserById(ownerId);
        ownerEmail = owner.email;
      } catch {
        // Fall back to actor email; the request still records the owner id.
      }
    }

    // Contact phone fallback: explicit override → machine phone → profile phone.
    let contactPhone = (input.contactPhone ?? "").trim() || (machine.contact_phone ?? "").trim();
    if (!contactPhone) {
      try {
        const { profile } = await getUserProfile(ownerId);
        contactPhone = (profile?.contactPhone ?? "").trim();
      } catch {
        // ignore — handled by the guard below
      }
    }
    if (!contactPhone) {
      return reply.code(400).send({
        message: "Add a contact phone to your profile before creating a request.",
      });
    }

    const issueType = issueTypeSchema.parse(input.issueType);
    const label: string = machine.display_label;
    const subject = `${ISSUE_TYPE_LABELS[issueType]} — ${label}`;
    const requestId = randomUUID();
    const requestNumber = buildRequestNumber();
    const now = new Date().toISOString();

    // The request row and its "created" history entry are one logical write.
    await sql.begin(async (tx) => {
      await tx`
        insert into service_desk.requests (
          id,
          request_number,
          customer_id,
          customer_email,
          product_id,
          product_snapshot,
          customer_machine_id,
          issue_type,
          subject,
          description,
          contact_phone,
          site_location,
          serial_number,
          priority,
          status
        )
        values (
          ${requestId},
          ${requestNumber},
          ${ownerId},
          ${ownerEmail},
          ${machine.product_id},
          ${sql.json(machine.product_snapshot as any)},
          ${machine.id},
          ${issueType},
          ${subject},
          ${input.description},
          ${contactPhone},
          ${machine.site_location},
          ${machine.internal_serial_number ?? null},
          ${input.priority},
          ${"new"}
        )
      `;

      await addHistory(
        requestId,
        actor,
        "request_created",
        {
          requestNumber,
          productId: machine.product_id,
          customerMachineId: machine.id,
          issueType,
        },
        tx,
      );
    });
    await emitOutbox("request.created", requestId, {
      requestId,
      requestNumber,
      customerId: ownerId,
      customerEmail: ownerEmail,
      customerName: actor.displayName,
      productName: machine.product_snapshot?.name ?? machine.product_id,
      productId: machine.product_id,
      customerMachineId: machine.id,
      machineLabel: label,
      issueType,
      location: machine.site_location,
      subject,
      status: "new",
      createdAt: now,
    });

    const insertedRows = await sql<any[]>`
      select * from service_desk.requests where id = ${requestId} limit 1
    `;
    return mapRequestRow(insertedRows[0]);
  }

  // ── Legacy product-based flow (admin/back-compat) ────────────────────────
  const input = createServiceRequestInputSchema.parse(request.body);
  const product = await getCatalogProduct(input.productId);
  const requestId = randomUUID();
  const requestNumber = buildRequestNumber();
  const now = new Date().toISOString();

  const productSnapshot = {
    id: product.id,
    categorySlug: product.categorySlug,
    slug: product.slug,
    name: product.name,
    priceDisplay: product.priceDisplay,
  };

  // The request row and its "created" history entry are one logical write.
  await sql.begin(async (tx) => {
    await tx`
      insert into service_desk.requests (
        id,
        request_number,
        customer_id,
        customer_email,
        product_id,
        product_snapshot,
        subject,
        description,
        contact_phone,
        site_location,
        serial_number,
        priority,
        status
      )
      values (
        ${requestId},
        ${requestNumber},
        ${actor.id},
        ${actor.email},
        ${product.id},
        ${sql.json(productSnapshot as any)},
        ${input.subject},
        ${input.description},
        ${input.contactPhone},
        ${input.siteLocation},
        ${input.serialNumber ?? null},
        ${input.priority},
        ${"new"}
      )
    `;

    await addHistory(
      requestId,
      actor,
      "request_created",
      { requestNumber, productId: product.id },
      tx,
    );
  });
  await emitOutbox("request.created", requestId, {
    requestId,
    requestNumber,
    customerId: actor.id,
    customerEmail: actor.email,
    customerName: actor.displayName,
    productName: product.name,
    productId: product.id,
    subject: input.subject,
    status: "new",
    createdAt: now,
  });

  return serviceRequestSchema.parse({
    id: requestId,
    requestNumber,
    customerId: actor.id,
    productId: product.id,
    productSnapshot,
    subject: input.subject,
    description: input.description,
    contactPhone: input.contactPhone,
    siteLocation: input.siteLocation,
    serialNumber: input.serialNumber ?? null,
    priority: input.priority,
    status: "new",
    assignedEngineerId: null,
    createdAt: now,
    updatedAt: now,
  });
});

app.get("/requests", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const querySchema = z.object({
    scope: z.enum(["mine", "queue"]).optional(),
    statusGroup: requestStatusGroupSchema.default("all"),
  });
  const query = querySchema.parse(request.query);

  let rows;
  if (actor.role === "customer") {
    rows = await sql<any[]>`
      select *
      from service_desk.requests
      where customer_id = ${actor.id}
      order by created_at desc
    `;
  } else if (query.scope === "queue") {
    rows = await sql<any[]>`
      select *
      from service_desk.requests
      where status != 'closed'
        and (
          assigned_engineer_id is null
          or assigned_engineer_id = ${actor.id}
        )
      order by created_at desc
    `;
  } else if (actor.role === "engineer") {
    rows = await sql<any[]>`
      select *
      from service_desk.requests
      where assigned_engineer_id = ${actor.id}
        or (
          assigned_engineer_id is null
          and status != 'closed'
        )
      order by created_at desc
    `;
  } else {
    rows = await sql<any[]>`
      select *
      from service_desk.requests
      order by created_at desc
    `;
  }

  return rows
    .filter((row) => statusBelongsToGroup(row.status, query.statusGroup, actor.role))
    .map(mapRequestRow);
});

app.get("/requests/:requestId", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const page = z
    .object({
      messagesLimit: z.coerce.number().int().min(1).max(50).default(50),
      messagesOffset: z.coerce.number().int().min(0).max(100_000).default(0),
      historyLimit: z.coerce.number().int().min(1).max(50).default(50),
      historyOffset: z.coerce.number().int().min(0).max(100_000).default(0),
    })
    .parse(request.query);

  const rows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;

  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  const allowed = canViewRequest(toWorkflowActor(actor), {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status,
  });

  if (!allowed) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const rawMessageRows =
    actor.role === "customer"
      ? await sql<any[]>`
          select *
          from service_desk.request_messages
          where request_id = ${params.requestId}
            and visibility = 'customer_visible'
          order by created_at desc, id desc
          limit ${page.messagesLimit + 1}
          offset ${page.messagesOffset}
        `
      : await sql<any[]>`
          select *
          from service_desk.request_messages
          where request_id = ${params.requestId}
          order by created_at desc, id desc
          limit ${page.messagesLimit + 1}
          offset ${page.messagesOffset}
        `;
  const messagesHasMore = rawMessageRows.length > page.messagesLimit;
  const messageRows = rawMessageRows.slice(0, page.messagesLimit).reverse();

  const rawHistoryRows =
    actor.role === "customer"
      ? []
      : await sql<any[]>`
          select *
          from service_desk.request_history
          where request_id = ${params.requestId}
          order by created_at desc, id desc
          limit ${page.historyLimit + 1}
          offset ${page.historyOffset}
        `;
  const historyHasMore = rawHistoryRows.length > page.historyLimit;
  const historyRows = rawHistoryRows.slice(0, page.historyLimit).reverse();

  // Resolve display info for participants the UI needs to render — the
  // assignee plus every message author. Done in parallel and silently
  // tolerant of lookup failures so a stale author id never breaks the
  // detail page.
  const participantIds = new Set<string>();
  if (current.assigned_engineer_id) participantIds.add(current.assigned_engineer_id);
  for (const row of messageRows) {
    if (row.author_id) participantIds.add(row.author_id);
  }
  const participantEntries = await Promise.all(
    Array.from(participantIds).map(async (id) => {
      try {
        const user = await getUserById(id);
        return [id, user] as const;
      } catch {
        return [id, null] as const;
      }
    }),
  );
  const participantMap = new Map(participantEntries);

  const isStaff = actor.role !== "customer";

  // Serial number is internal/admin-only on the customer-machine model — never
  // surface it to the customer who raised the request.
  const requestPayload = mapRequestRow(current);
  if (!isStaff) {
    requestPayload.serialNumber = null;
  }

  // Attachments (photo/video evidence). Each gets a fresh short-lived read URL.
  const attachmentRows = await sql<any[]>`
    select
      attachment.*,
      (
        select message.id
        from service_desk.request_messages message
        where message.request_id = attachment.request_id
          and message.author_id = attachment.uploaded_by
          and message.visibility = 'customer_visible'
          and message.created_at <= attachment.created_at
          and attachment.created_at <= message.created_at + interval '15 minutes'
        order by message.created_at desc, message.id desc
        limit 1
      ) as message_id
    from service_desk.request_attachments attachment
    where attachment.request_id = ${params.requestId}
    order by attachment.created_at asc
  `;
  const attachments = await Promise.all(
    attachmentRows.map(async (a) => {
      let url = "";
      try {
        url = await attachmentReadUrl({ objectKey: a.object_key, fileName: a.file_name });
      } catch {
        // R2 unreachable/unconfigured — return metadata with an empty URL so
        // the page still lists the file rather than 500-ing.
      }
      return requestAttachmentSchema.parse({
        id: a.id,
        requestId: a.request_id,
        messageId: a.message_id,
        uploadedBy: a.uploaded_by,
        fileName: a.file_name,
        contentType: a.content_type,
        sizeBytes: Number(a.size_bytes),
        kind: a.kind,
        url,
        createdAt: new Date(a.created_at).toISOString(),
      });
    }),
  );

  // The linked machine, if any. Staff see the full record (internal serial);
  // the customer sees the safe view. Null for legacy requests or if the
  // machine was later removed — the request still renders from its own snapshot.
  let machine: unknown = null;
  if (current.customer_machine_id) {
    const machineRow = await getMachineById(current.customer_machine_id);
    if (machineRow) {
      machine = isStaff ? mapMachineRow(machineRow) : mapMachinePublic(machineRow);
    }
  }

  // Customer identity for staff (name + workshop). Tolerant of lookup failure.
  let customer: { displayName: string; companyName: string | null } | null = null;
  if (isStaff) {
    try {
      const { user, profile } = await getUserProfile(current.customer_id);
      customer = {
        displayName: profile?.displayName ?? user.displayName,
        companyName: profile?.companyName ?? null,
      };
    } catch {
      customer = null;
    }
  }

  return {
    request: requestPayload,
    attachments,
    machine,
    customer,
    assignedEngineer: (() => {
      if (!current.assigned_engineer_id) return null;
      const user = participantMap.get(current.assigned_engineer_id);
      if (!user) return null;
      return {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
      };
    })(),
    messages: messageRows.map((row) => {
      const author = row.author_id ? participantMap.get(row.author_id) : null;
      return requestMessageSchema.parse({
        id: row.id,
        requestId: row.request_id,
        authorId: row.author_id,
        authorRole: row.author_role,
        authorDisplayName: author?.displayName ?? null,
        authorEmail: author?.email ?? null,
        visibility: row.visibility,
        body: row.body,
        createdAt: new Date(row.created_at).toISOString(),
      });
    }),
    history: historyRows.map((row) => ({
      id: row.id,
      requestId: row.request_id,
      actorId: row.actor_id,
      actorRole: row.actor_role,
      eventType: row.event_type,
      metadata: row.metadata,
      createdAt: new Date(row.created_at).toISOString(),
    })),
    pagination: {
      messages: {
        offset: page.messagesOffset,
        limit: page.messagesLimit,
        hasMore: messagesHasMore,
      },
      history: {
        offset: page.historyOffset,
        limit: page.historyLimit,
        hasMore: historyHasMore,
      },
    },
  };
});

app.patch("/requests/:requestId", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = updateServiceRequestInputSchema.parse(request.body);

  const rows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;

  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  if (
    !canEditRequestDetails(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const nextDetails = {
    subject: input.subject ?? current.subject,
    description: input.description ?? current.description,
    contactPhone: input.contactPhone ?? current.contact_phone,
    siteLocation: input.siteLocation ?? current.site_location,
    serialNumber:
      input.serialNumber === undefined
        ? current.serial_number
        : input.serialNumber?.trim() || null,
  };

  const changedFields = [
    current.subject !== nextDetails.subject ? "subject" : null,
    current.description !== nextDetails.description ? "description" : null,
    current.contact_phone !== nextDetails.contactPhone ? "contactPhone" : null,
    current.site_location !== nextDetails.siteLocation ? "siteLocation" : null,
    (current.serial_number ?? null) !== (nextDetails.serialNumber ?? null) ? "serialNumber" : null,
  ].filter((field): field is string => Boolean(field));

  if (changedFields.length === 0) {
    return mapRequestRow(current);
  }

  // The detail update and its history entry are one logical write.
  const updatedRow = await sql.begin(async (tx) => {
    const rows = await tx<any[]>`
      update service_desk.requests
      set subject = ${nextDetails.subject},
          description = ${nextDetails.description},
          contact_phone = ${nextDetails.contactPhone},
          site_location = ${nextDetails.siteLocation},
          serial_number = ${nextDetails.serialNumber},
          updated_at = now()
      where id = ${params.requestId}
      returning *
    `;

    await addHistory(
      params.requestId,
      actor,
      "request_updated",
      { fields: changedFields },
      tx,
    );

    return rows[0];
  });

  return mapRequestRow(updatedRow);
});

app.post("/requests/:requestId/messages", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = createRequestMessageInputSchema.parse(request.body);

  if (actor.role === "customer" && input.visibility !== "customer_visible") {
    return reply.code(403).send({ message: "Customers cannot add internal notes." });
  }

  const requestRows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;

  const current = requestRows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  if (
    !canReplyToRequest(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const messageId = randomUUID();
  // Message row, the request's updated_at bump, and the history entry are one
  // logical write — a partial commit would leave the timeline inconsistent.
  await sql.begin(async (tx) => {
    await tx`
      insert into service_desk.request_messages (
        id,
        request_id,
        author_id,
        author_role,
        visibility,
        body
      )
      values (
        ${messageId},
        ${params.requestId},
        ${actor.id},
        ${actor.role},
        ${input.visibility},
        ${input.body}
      )
    `;

    await tx`
      update service_desk.requests
      set updated_at = now()
      where id = ${params.requestId}
    `;

    await addHistory(
      params.requestId,
      actor,
      "message_added",
      { visibility: input.visibility },
      tx,
    );
  });

  if (actor.role === "customer") {
    await emitOutbox("request.customer_message_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: input.body,
    });
  } else if (input.visibility === "customer_visible") {
    await emitOutbox("request.staff_reply_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: input.body,
      authorName: actor.displayName,
    });
  }

  return requestMessageSchema.parse({
    id: messageId,
    requestId: params.requestId,
    authorId: actor.id,
    authorRole: actor.role,
    visibility: input.visibility,
    body: input.body,
    createdAt: new Date().toISOString(),
  });
});

app.post("/requests/:requestId/claim", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  if (actor.role === "customer") {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);

  const rows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  // Explicit conflict path: if the request is already assigned, never
  // re-claim — neither by the current owner (would create duplicate
  // "Request Claimed" history) nor by anyone else (would silently steal
  // another engineer's work). Admin reassignment uses `/assign` instead.
  if (current.assigned_engineer_id) {
    const message =
      current.assigned_engineer_id === actor.id
        ? "You have already claimed this request."
        : "This request is already assigned to another engineer.";
    return reply.code(409).send({ message });
  }

  if (
    !canClaimRequest(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  // The claim and its history entry are one logical write.
  await sql.begin(async (tx) => {
    await tx`
      update service_desk.requests
      set assigned_engineer_id = ${actor.id},
          status = ${"assigned"},
          updated_at = now()
      where id = ${params.requestId}
    `;

    await addHistory(params.requestId, actor, "request_claimed", {}, tx);
  });
  // Look up the customer so the claim email can address them by name.
  // Tolerant: if the lookup fails the email still goes out with just the
  // email address.
  let customerName: string | null = null;
  try {
    const customer = await getUserById(current.customer_id);
    customerName = customer.displayName ?? null;
  } catch {
    customerName = null;
  }
  await emitOutbox("request.assigned", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    engineerEmail: actor.email,
    engineerName: actor.displayName,
    customerEmail: current.customer_email,
    customerName,
    product: current.product_snapshot?.name ?? null,
    location: current.site_location ?? null,
    phone: current.contact_phone ?? null,
    status: "assigned",
  });

  return { ok: true };
});

app.post("/requests/:requestId/assign", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  // Admin, owner and support can assign/reassign requests to engineers.
  if (!canAssignRequests(actor.role)) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = assignRequestInputSchema.parse(request.body);
  const engineer = await getUserById(input.engineerId);

  const rows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = rows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  if (engineer.role !== "engineer") {
    return reply.code(400).send({ message: "Only engineer accounts can be assigned." });
  }

  const previousEngineerId: string | null = current.assigned_engineer_id ?? null;
  // No-op guard: re-assigning the same engineer should not pollute history.
  if (previousEngineerId === engineer.id) {
    return { ok: true };
  }

  // Distinguish first-time assignment from reassignment so the activity
  // timeline reads correctly ("Request Reassigned" vs "Request Assigned").
  const eventType = previousEngineerId ? "request_reassigned" : "request_assigned";
  // The assignment and its history entry are one logical write. Before this
  // was transactional, a rejected history insert (e.g. a support actor under
  // the pre-005 role CHECK) left the request assigned while the endpoint 500d.
  await sql.begin(async (tx) => {
    await tx`
      update service_desk.requests
      set assigned_engineer_id = ${engineer.id},
          status = ${"assigned"},
          updated_at = now()
      where id = ${params.requestId}
    `;

    await addHistory(
      params.requestId,
      actor,
      eventType,
      {
        engineerId: engineer.id,
        engineerEmail: engineer.email,
        previousEngineerId,
      },
      tx,
    );
  });
  await emitOutbox("request.assigned", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    engineerEmail: engineer.email,
    engineerName: engineer.displayName,
    customerEmail: current.customer_email,
    status: "assigned",
  });

  return { ok: true };
});

app.post("/requests/:requestId/status", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  if (actor.role === "customer") {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = updateRequestStatusInputSchema.parse(request.body);

  const currentRows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = currentRows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  const nextStatus = requestStatusSchema.parse(input.status);
  const workflowRequest = {
    customerId: current.customer_id,
    assignedEngineerId: current.assigned_engineer_id,
    status: current.status as typeof nextStatus,
  };
  // `canTransitionRequestTo` combines the per-user permission check
  // (assignment / role) with the strict transition map and the admin-only
  // reopen guard. One call replaces the previous two-step check and adds
  // the reopen rule.
  if (!canTransitionRequestTo(toWorkflowActor(actor), workflowRequest, nextStatus)) {
    if (!isValidStatusTransition(current.status, nextStatus)) {
      return reply.code(400).send({ message: "Invalid workflow transition." });
    }
    return reply.code(403).send({ message: "Forbidden" });
  }

  const noteBody = input.note?.trim();
  const noteVisibility = input.visibility ?? "customer_visible";

  // Status update, the optional note, and the history entry are one logical
  // write — the status must never move without its matching history row.
  await sql.begin(async (tx) => {
    await tx`
      update service_desk.requests
      set status = ${nextStatus},
          updated_at = now()
      where id = ${params.requestId}
    `;

    if (noteBody) {
      await tx`
        insert into service_desk.request_messages (
          id,
          request_id,
          author_id,
          author_role,
          visibility,
          body
        )
        values (
          ${randomUUID()},
          ${params.requestId},
          ${actor.id},
          ${actor.role},
          ${noteVisibility},
          ${noteBody}
        )
      `;
    }

    await addHistory(
      params.requestId,
      actor,
      "status_changed",
      noteBody
        ? { from: current.status, to: nextStatus, noteVisibility }
        : { from: current.status, to: nextStatus },
      tx,
    );
  });
  await emitOutbox("request.status_changed", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    customerEmail: current.customer_email,
    previousStatus: current.status,
    status: nextStatus,
    actorName: actor.displayName,
  });

  if (noteBody && noteVisibility === "customer_visible") {
    await emitOutbox("request.staff_reply_posted", params.requestId, {
      requestId: params.requestId,
      requestNumber: current.request_number,
      customerEmail: current.customer_email,
      body: noteBody,
      authorName: actor.displayName,
    });
  }

  return { ok: true };
});

app.post("/requests/:requestId/cancel", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const actor = getUserContext(request.headers);
  const paramsSchema = z.object({ requestId: z.string().uuid() });
  const params = paramsSchema.parse(request.params);
  const input = cancelRequestInputSchema.parse(request.body ?? {});

  const currentRows = await sql<any[]>`
    select *
    from service_desk.requests
    where id = ${params.requestId}
    limit 1
  `;
  const current = currentRows[0];
  if (!current) {
    return reply.code(404).send({ message: "Request not found." });
  }

  if (current.status === "closed") {
    return { ok: true };
  }

  if (actor.role === "customer") {
    if (current.customer_id !== actor.id) {
      return reply.code(403).send({ message: "Forbidden" });
    }

    if (!["new", "triaged", "waiting_for_customer"].includes(current.status)) {
      return reply.code(400).send({
        message: "Only open or pending requests can be cancelled by customers.",
      });
    }
  } else if (
    !canUpdateRequestStatus(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const reason = input.reason?.trim();
  // The close and its history entry are one logical write.
  await sql.begin(async (tx) => {
    await tx`
      update service_desk.requests
      set status = ${"closed"},
          updated_at = now()
      where id = ${params.requestId}
    `;

    await addHistory(
      params.requestId,
      actor,
      actor.role === "customer" ? "request_cancelled" : "request_archived",
      reason
        ? { from: current.status, to: "closed", reason }
        : { from: current.status, to: "closed" },
      tx,
    );
  });
  await emitOutbox("request.status_changed", params.requestId, {
    requestId: params.requestId,
    requestNumber: current.request_number,
    customerEmail: current.customer_email,
    previousStatus: current.status,
    status: "closed",
    actorName: actor.displayName,
  });

  return { ok: true };
});

// ─── Customer machines: customer-facing read ────────────────────────────────
// The current user's own active machines, safe view only (no internal serial).
app.get("/me/machines", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const rows = await sql<any[]>`
    select *
    from service_desk.customer_machines
    where customer_id = ${actor.id}
      and status = 'active'
    order by created_at asc
  `;
  return rows.map(mapMachinePublic);
});

// ─── Customer machines: admin management ────────────────────────────────────
const customerParamSchema = z.object({ customerId: z.string().uuid() });
const machineParamSchema = z.object({ machineId: z.string().uuid() });

app.get("/admin/customers/:customerId/machines", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  if (!ensureOperational(actor, reply)) return;
  const params = customerParamSchema.parse(request.params);
  const rows = await sql<any[]>`
    select *
    from service_desk.customer_machines
    where customer_id = ${params.customerId}
    order by created_at desc
  `;
  return rows.map(mapMachineRow);
});

app.post("/admin/customers/:customerId/machines", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  if (!ensureOperational(actor, reply)) return;
  const params = customerParamSchema.parse(request.params);
  const input = createCustomerMachineInputSchema.parse(request.body);

  const customerError = await customerAssignmentError(params.customerId);
  if (customerError) {
    return reply.code(400).send({ message: customerError });
  }
  const result = await createMachineForCustomer(params.customerId, input);
  if (result.error || !result.row) {
    return reply.code(400).send({ message: result.error ?? "Could not link machine." });
  }
  const machineRow = result.row;
  await emitOutbox("customer_machine.linked", machineRow.id, {
    machineId: machineRow.id,
    customerId: params.customerId,
    productId: machineRow.product_id,
    productName: machineRow.product_snapshot?.name ?? machineRow.product_id,
    displayLabel: machineRow.display_label,
    linkedBy: actor.id,
  });
  return reply.code(201).send(mapMachineRow(machineRow));
});

// ── Dashboard collection API: list all assignments (admin) ──────────────────
app.get("/admin/customer-machines", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  if (!ensureOperational(actor, reply)) return;
  const query = adminMachineListQuerySchema.parse(request.query);

  const rows = await sql<any[]>`
    select *
    from service_desk.customer_machines
    where (${query.customerId ?? null}::uuid is null or customer_id = ${query.customerId ?? null})
      and (${query.productId ?? null}::text is null or product_id = ${query.productId ?? null})
      and (${query.status ?? null}::text is null or status = ${query.status ?? null})
    order by updated_at desc
  `;
  return rows.map(mapMachineRow);
});

// ── Dashboard collection API: link a machine to a chosen customer (admin) ───
app.post("/admin/customer-machines", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  if (!ensureOperational(actor, reply)) return;
  const input = adminLinkMachineInputSchema.parse(request.body);

  const customerError = await customerAssignmentError(input.customerId);
  if (customerError) {
    return reply.code(400).send({ message: customerError });
  }
  const { customerId, ...machineInput } = input;
  const result = await createMachineForCustomer(customerId, machineInput);
  if (result.error || !result.row) {
    return reply.code(400).send({ message: result.error ?? "Could not link machine." });
  }
  const machineRow = result.row;
  await emitOutbox("customer_machine.linked", machineRow.id, {
    machineId: machineRow.id,
    customerId,
    productId: machineRow.product_id,
    productName: machineRow.product_snapshot?.name ?? machineRow.product_id,
    displayLabel: machineRow.display_label,
    linkedBy: actor.id,
  });
  return reply.code(201).send(mapMachineRow(machineRow));
});

app.patch("/admin/machines/:machineId", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  if (!ensureOperational(actor, reply)) return;
  const params = machineParamSchema.parse(request.params);
  const input = updateCustomerMachineInputSchema.parse(request.body);

  const existing = await getMachineById(params.machineId);
  if (!existing) {
    return reply.code(404).send({ message: "Machine not found." });
  }

  const keep = <T>(provided: T | undefined, current: T): T =>
    provided === undefined ? current : provided;
  const next = {
    displayLabel: input.displayLabel?.trim() || existing.display_label,
    unitNumber: keep(input.unitNumber, existing.unit_number ?? null),
    internalSerialNumber: keep(
      input.internalSerialNumber,
      existing.internal_serial_number ?? null,
    ),
    siteName: keep(input.siteName, existing.site_name ?? null),
    siteLocation: input.siteLocation?.trim() || existing.site_location,
    contactPhone: keep(input.contactPhone, existing.contact_phone ?? null),
    purchaseDate: keep(input.purchaseDate, toDateString(existing.purchase_date)),
    installDate: keep(input.installDate, toDateString(existing.install_date)),
    status: keep(input.status, existing.status),
    notes: keep(input.notes, existing.notes ?? null),
  };

  await sql`
    update service_desk.customer_machines set
      display_label = ${next.displayLabel},
      unit_number = ${next.unitNumber},
      internal_serial_number = ${next.internalSerialNumber},
      site_name = ${next.siteName},
      site_location = ${next.siteLocation},
      contact_phone = ${next.contactPhone},
      purchase_date = ${next.purchaseDate || null},
      install_date = ${next.installDate || null},
      status = ${next.status},
      notes = ${next.notes},
      updated_at = now()
    where id = ${params.machineId}
  `;
  const rows = await sql<any[]>`
    select * from service_desk.customer_machines where id = ${params.machineId} limit 1
  `;
  return mapMachineRow(rows[0]);
});

// Deactivate (soft). The row is kept so existing requests that reference it
// still render; status flips to 'inactive' so it drops out of the customer's
// machine list and can't be used for new requests.
app.delete("/admin/machines/:machineId", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  if (!ensureOperational(actor, reply)) return;
  const params = machineParamSchema.parse(request.params);
  const existing = await getMachineById(params.machineId);
  if (!existing) {
    return reply.code(404).send({ message: "Machine not found." });
  }
  await sql`
    update service_desk.customer_machines
    set status = 'inactive', updated_at = now()
    where id = ${params.machineId}
  `;
  return { ok: true };
});

// ─── Request attachments (Cloudflare R2) ────────────────────────────────────
async function loadRequestForAttachment(requestId: string) {
  const rows = await sql<any[]>`
    select * from service_desk.requests where id = ${requestId} limit 1
  `;
  return rows[0] ?? null;
}

// Step 1: issue a presigned PUT so the browser uploads straight to R2.
app.post("/requests/:requestId/attachments/presign", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  const input = presignAttachmentInputSchema.parse(request.body);

  if (input.visibility === "internal_note") {
    return reply
      .code(400)
      .send({ message: "Attachments are not allowed on internal notes." });
  }
  if (!isR2Configured()) {
    return reply.code(501).send({ message: "Attachments are not configured." });
  }
  if (!isAllowedAttachmentType(input.contentType)) {
    return reply.code(400).send({ message: "Unsupported file type." });
  }
  if (input.sizeBytes > maxAttachmentBytes()) {
    return reply.code(400).send({ message: "File is too large." });
  }
  if (!attachmentKindFor(input.contentType)) {
    return reply.code(400).send({ message: "Unsupported file type." });
  }

  const current = await loadRequestForAttachment(params.requestId);
  if (!current) return reply.code(404).send({ message: "Request not found." });
  if (
    !canViewRequest(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const objectKey = buildAttachmentObjectKey(params.requestId, input.fileName);
  const { uploadUrl, headers } = await presignAttachmentUpload({
    objectKey,
    contentType: input.contentType,
  });
  return { uploadUrl, objectKey, headers, maxBytes: maxAttachmentBytes() };
});

// Step 2: persist the metadata after a successful direct upload.
app.post("/requests/:requestId/attachments", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);
  const input = confirmAttachmentInputSchema.parse(request.body);

  if (input.visibility === "internal_note") {
    return reply
      .code(400)
      .send({ message: "Attachments are not allowed on internal notes." });
  }
  if (!isR2Configured()) {
    return reply.code(501).send({ message: "Attachments are not configured." });
  }
  const kind = attachmentKindFor(input.contentType);
  if (!isAllowedAttachmentType(input.contentType) || !kind) {
    return reply.code(400).send({ message: "Unsupported file type." });
  }
  if (input.sizeBytes > maxAttachmentBytes()) {
    return reply.code(400).send({ message: "File is too large." });
  }
  // The object key must live under this request's prefix — blocks writing a
  // metadata row that points at another request's (or arbitrary) object.
  if (!input.objectKey.startsWith(`service-requests/${params.requestId}/`)) {
    return reply.code(400).send({ message: "Invalid object key." });
  }

  const current = await loadRequestForAttachment(params.requestId);
  if (!current) return reply.code(404).send({ message: "Request not found." });
  if (
    !canViewRequest(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }
  if (input.messageId) {
    const messageRows = await sql<any[]>`
      select id
      from service_desk.request_messages
      where id = ${input.messageId}
        and request_id = ${params.requestId}
        and author_id = ${actor.id}
        and visibility = 'customer_visible'
      limit 1
    `;
    if (!messageRows[0]) {
      return reply
        .code(400)
        .send({ message: "Attachment message is invalid." });
    }
  }

  const attachmentId = randomUUID();
  // The attachment row and its history entry are one logical write.
  await sql.begin(async (tx) => {
    await tx`
      insert into service_desk.request_attachments (
        id, request_id, uploaded_by, object_key, file_name, content_type, size_bytes, kind
      )
      values (
        ${attachmentId},
        ${params.requestId},
        ${actor.id},
        ${input.objectKey},
        ${input.fileName},
        ${input.contentType},
        ${input.sizeBytes},
        ${kind}
      )
    `;

    await addHistory(params.requestId, actor, "attachment_added", { kind }, tx);
  });

  let url = "";
  try {
    url = await attachmentReadUrl({ objectKey: input.objectKey, fileName: input.fileName });
  } catch {
    /* metadata is saved; URL can be regenerated on read */
  }
  return reply.code(201).send(
    requestAttachmentSchema.parse({
      id: attachmentId,
      requestId: params.requestId,
      messageId: input.messageId ?? null,
      uploadedBy: actor.id,
      fileName: input.fileName,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      kind,
      url,
      createdAt: new Date().toISOString(),
    }),
  );
});

app.get("/requests/:requestId/attachments", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const actor = getUserContext(request.headers);
  const params = z.object({ requestId: z.string().uuid() }).parse(request.params);

  const current = await loadRequestForAttachment(params.requestId);
  if (!current) return reply.code(404).send({ message: "Request not found." });
  if (
    !canViewRequest(toWorkflowActor(actor), {
      customerId: current.customer_id,
      assignedEngineerId: current.assigned_engineer_id,
      status: current.status,
    })
  ) {
    return reply.code(403).send({ message: "Forbidden" });
  }

  const rows = await sql<any[]>`
    select
      attachment.*,
      (
        select message.id
        from service_desk.request_messages message
        where message.request_id = attachment.request_id
          and message.author_id = attachment.uploaded_by
          and message.visibility = 'customer_visible'
          and message.created_at <= attachment.created_at
          and attachment.created_at <= message.created_at + interval '15 minutes'
        order by message.created_at desc, message.id desc
        limit 1
      ) as message_id
    from service_desk.request_attachments attachment
    where attachment.request_id = ${params.requestId}
    order by attachment.created_at asc
  `;
  return Promise.all(
    rows.map(async (a) => {
      let url = "";
      try {
        url = await attachmentReadUrl({ objectKey: a.object_key, fileName: a.file_name });
      } catch {
        /* keep empty */
      }
      return requestAttachmentSchema.parse({
        id: a.id,
        requestId: a.request_id,
        messageId: a.message_id,
        uploadedBy: a.uploaded_by,
        fileName: a.file_name,
        contentType: a.content_type,
        sizeBytes: Number(a.size_bytes),
        kind: a.kind,
        url,
        createdAt: new Date(a.created_at).toISOString(),
      });
    }),
  );
});

// ── Customer-activity aggregates (internal) ─────────────────────────────────
// Powers the Customer Activity dashboard. The gateway calls these with trusted
// internal headers *after* enforcing the admin/owner/support RBAC, so there is
// no per-actor role check here. Returns request + machine aggregates keyed by
// customer id; the gateway joins them with the auth user list.
app.get("/internal/customer-activity", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }

  const perCustomer = await sql<any[]>`
    select
      customer_id,
      count(*)::int as total_requests,
      count(*) filter (where status not in ('resolved', 'closed'))::int as open_requests,
      count(*) filter (where status = 'resolved')::int as resolved_requests,
      count(*) filter (where status = 'waiting_for_customer')::int as pending_requests,
      max(updated_at) as last_activity
    from service_desk.requests
    group by customer_id
  `;
  const latest = await sql<any[]>`
    select distinct on (customer_id)
      customer_id, subject, status, created_at
    from service_desk.requests
    order by customer_id, created_at desc
  `;
  const machines = await sql<any[]>`
    select customer_id, count(*)::int as machine_count
    from service_desk.customer_machines
    where status = 'active'
    group by customer_id
  `;

  const latestById = new Map(latest.map((r) => [r.customer_id, r]));
  const machinesById = new Map(machines.map((r) => [r.customer_id, r.machine_count]));

  const customers = perCustomer.map((r) => {
    const latestRow = latestById.get(r.customer_id);
    return {
      customerId: r.customer_id,
      totalRequests: r.total_requests,
      openRequests: r.open_requests,
      resolvedRequests: r.resolved_requests,
      pendingRequests: r.pending_requests,
      machineCount: machinesById.get(r.customer_id) ?? 0,
      lastActivity: r.last_activity ? new Date(r.last_activity).toISOString() : null,
      latestSubject: latestRow?.subject ?? null,
      latestStatus: latestRow?.status ?? null,
      latestAt: latestRow?.created_at ? new Date(latestRow.created_at).toISOString() : null,
    };
  });
  // Customers that own machines but have no requests yet still matter.
  for (const m of machines) {
    if (!customers.some((c) => c.customerId === m.customer_id)) {
      customers.push({
        customerId: m.customer_id,
        totalRequests: 0,
        openRequests: 0,
        resolvedRequests: 0,
        pendingRequests: 0,
        machineCount: m.machine_count,
        lastActivity: null,
        latestSubject: null,
        latestStatus: null,
        latestAt: null,
      });
    }
  }

  return { customers };
});

app.get("/internal/customer-activity/:customerId", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = z.object({ customerId: z.string().uuid() }).parse(request.params);

  const requestRows = await sql<any[]>`
    select *
    from service_desk.requests
    where customer_id = ${params.customerId}
    order by created_at desc
  `;
  const machineRows = await sql<any[]>`
    select *
    from service_desk.customer_machines
    where customer_id = ${params.customerId}
    order by updated_at desc
  `;

  const stats = {
    totalRequests: requestRows.length,
    openRequests: requestRows.filter(
      (r) => r.status !== "resolved" && r.status !== "closed",
    ).length,
    pendingRequests: requestRows.filter((r) => r.status === "waiting_for_customer").length,
    resolvedRequests: requestRows.filter((r) => r.status === "resolved").length,
    machineCount: machineRows.filter((r) => r.status === "active").length,
  };

  return {
    stats,
    requests: requestRows.map(mapRequestRow),
    machines: machineRows.map(mapMachineRow),
  };
});

// ─── Activity console projections (read-only) ───────────────────────────────
// Person-centric views over data that already exists. No writes, no schema
// additions. Cross-service identity (display names) is deliberately NOT
// resolved here — the gateway already holds the user directory and fills names
// in one batch, which keeps this service free of per-row auth lookups.

const ACTIVE_STATUSES = ["assigned", "in_progress"] as const;
const CLOSED_STATUSES = ["resolved", "closed"] as const;

/** Opaque keyset cursor over a (timestamp, uuid) pair. Deterministic and
 *  stable under concurrent inserts, unlike offset paging. */
function encodeCursor(occurredAt: Date | string, id: string): string {
  const iso = occurredAt instanceof Date ? occurredAt.toISOString() : occurredAt;
  return Buffer.from(`${iso}|${id}`, "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { at: string; id: string } | null {
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf8");
    const separator = raw.lastIndexOf("|");
    if (separator === -1) return null;
    const at = raw.slice(0, separator);
    const id = raw.slice(separator + 1);
    if (!at || !id || Number.isNaN(Date.parse(at))) return null;
    return { at, id };
  } catch {
    return null;
  }
}

/**
 * Per-person workload and recorded-activity aggregates for the whole install.
 * Three grouped queries, no per-person round trip.
 */
app.get("/internal/activity/aggregates", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const query = z
    .object({ staleAfterDays: z.coerce.number().int().min(1).max(365).default(7) })
    .parse(request.query);

  // One pass over requests, counted twice per row: once against the assigned
  // engineer and once against the owning customer.
  const workload = await sql<any[]>`
    select
      t.person_id,
      t.rel,
      count(*)::int as total,
      count(*) filter (where t.status = 'in_progress')::int as in_progress,
      count(*) filter (where t.status = 'assigned')::int as pending,
      count(*) filter (where t.status = 'waiting_for_customer')::int as waiting,
      count(*) filter (where t.status in ${sql(CLOSED_STATUSES)})::int as completed,
      count(*) filter (where t.status not in ${sql(CLOSED_STATUSES)})::int as open,
      count(*) filter (
        where t.status in ${sql(ACTIVE_STATUSES)}
          and t.updated_at < now() - make_interval(days => ${query.staleAfterDays})
      )::int as stale,
      count(*) filter (
        where t.assigned_engineer_id is null and t.status not in ${sql(CLOSED_STATUSES)}
      )::int as unassigned
    from (
      select assigned_engineer_id as person_id, 'engineer' as rel,
             status, updated_at, assigned_engineer_id
        from service_desk.requests
       where assigned_engineer_id is not null
      union all
      select customer_id, 'customer',
             status, updated_at, assigned_engineer_id
        from service_desk.requests
      union all
      -- Who actually filed the request, which for staff-on-behalf work is not
      -- the customer. Taken from history so the attribution is recorded fact.
      select h.actor_id, 'creator',
             r.status, r.updated_at, r.assigned_engineer_id
        from service_desk.request_history h
        join service_desk.requests r on r.id = h.request_id
       where h.event_type = 'request_created'
    ) t
    group by t.person_id, t.rel
  `;

  const recorded = await sql<any[]>`
    select actor_id, count(*)::int as events, max(created_at) as last_activity
    from service_desk.request_history
    group by actor_id
  `;

  const machines = await sql<any[]>`
    select customer_id, count(*)::int as machine_count
    from service_desk.customer_machines
    where status = 'active'
    group by customer_id
  `;

  return {
    workload: workload.map((row) => ({
      personId: row.person_id,
      rel: row.rel as "engineer" | "customer" | "creator",
      total: row.total,
      inProgress: row.in_progress,
      pending: row.pending,
      waiting: row.waiting,
      completed: row.completed,
      open: row.open,
      stale: row.stale,
      unassigned: row.unassigned,
    })),
    recorded: recorded.map((row) => ({
      personId: row.actor_id,
      events: row.events,
      lastActivityAt: row.last_activity ? new Date(row.last_activity).toISOString() : null,
    })),
    machines: machines.map((row) => ({
      personId: row.customer_id,
      machineCount: row.machine_count,
    })),
  };
});

/** Detail metrics for one person: priority spread of their active work and a
 *  breakdown of their recorded actions by event type. */
app.get("/internal/activity/:userId/summary", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = z.object({ userId: z.string().uuid() }).parse(request.params);

  const priorities = await sql<any[]>`
    select t.rel, t.priority, count(*)::int as count
    from (
      select 'engineer' as rel, priority
        from service_desk.requests
       where assigned_engineer_id = ${params.userId}
         and status in ${sql(ACTIVE_STATUSES)}
      union all
      select 'customer', priority
        from service_desk.requests
       where customer_id = ${params.userId}
         and status not in ${sql(CLOSED_STATUSES)}
    ) t
    group by t.rel, t.priority
  `;

  const eventCounts = await sql<any[]>`
    select event_type, count(*)::int as count
    from service_desk.request_history
    where actor_id = ${params.userId}
    group by event_type
  `;

  const machineCount = await sql<any[]>`
    select count(*)::int as count
    from service_desk.customer_machines
    where customer_id = ${params.userId} and status = 'active'
  `;

  const byRel: Record<string, Record<string, number>> = { engineer: {}, customer: {} };
  for (const row of priorities) byRel[row.rel][row.priority] = row.count;

  return {
    priorityDistribution: byRel,
    eventCounts: Object.fromEntries(eventCounts.map((r) => [r.event_type, r.count])),
    machineCount: machineCount[0]?.count ?? 0,
  };
});

/**
 * Recorded actions performed BY one person, newest first, keyset-paginated.
 * `metadata` is free-form jsonb and is never returned raw — the gateway
 * whitelists it. Message bodies and cancellation reasons never leave here.
 */
app.get("/internal/activity/:userId/history", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = z.object({ userId: z.string().uuid() }).parse(request.params);
  const query = z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().max(200).optional(),
      eventTypes: z.string().max(400).optional(),
      search: z.string().trim().max(120).optional(),
    })
    .parse(request.query);

  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  if (query.cursor && !cursor) {
    return reply.code(400).send({ message: "Invalid cursor." });
  }
  const types = query.eventTypes
    ? query.eventTypes.split(",").map((t) => t.trim()).filter(Boolean)
    : null;
  const searchPattern = query.search ? `%${query.search}%` : null;

  // limit + 1 tells us whether another page exists without a second count query.
  const rows = await sql<any[]>`
    select
      h.id, h.event_type, h.actor_role, h.metadata, h.created_at,
      r.id as request_id, r.request_number, r.subject, r.status, r.customer_id
    from service_desk.request_history h
    join service_desk.requests r on r.id = h.request_id
    where h.actor_id = ${params.userId}
      ${types && types.length > 0 ? sql`and h.event_type in ${sql(types)}` : sql``}
      ${
        searchPattern
          ? sql`and (
              r.request_number ilike ${searchPattern}
              or r.subject ilike ${searchPattern}
              or h.event_type::text ilike ${searchPattern}
              or h.actor_role::text ilike ${searchPattern}
              or r.status::text ilike ${searchPattern}
            )`
          : sql``
      }
      ${cursor ? sql`and (h.created_at, h.id) < (${cursor.at}::timestamptz, ${cursor.id}::uuid)` : sql``}
    order by h.created_at desc, h.id desc
    limit ${query.limit + 1}
  `;

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page[page.length - 1];

  return {
    events: page.map((row) => ({
      id: row.id,
      occurredAt: new Date(row.created_at).toISOString(),
      eventType: row.event_type,
      recordedRole: row.actor_role,
      actorId: params.userId,
      metadata: row.metadata ?? {},
      request: {
        id: row.request_id,
        requestNumber: row.request_number,
        subject: row.subject,
        status: row.status,
        customerId: row.customer_id,
      },
    })),
    nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
  };
});

/**
 * The person's request workload. `rel` selects the relationship: an engineer's
 * assigned queue, or a customer's own requests. Keyset-paginated on
 * (updated_at, id). Internal machine serials are never selected.
 */
app.get("/internal/activity/:userId/tasks", async (request, reply) => {
  if (!ensureInternal(request.headers)) {
    return reply.code(401).send({ message: "Unauthorized" });
  }
  const params = z.object({ userId: z.string().uuid() }).parse(request.params);
  const query = z
    .object({
      rel: z.enum(["engineer", "customer"]).default("engineer"),
      bucket: z.enum(["active", "waiting", "completed", "all"]).default("active"),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      cursor: z.string().max(200).optional(),
      staleAfterDays: z.coerce.number().int().min(1).max(365).default(7),
      search: z.string().trim().max(120).optional(),
    })
    .parse(request.query);

  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  if (query.cursor && !cursor) {
    return reply.code(400).send({ message: "Invalid cursor." });
  }

  const ownership =
    query.rel === "engineer"
      ? sql`r.assigned_engineer_id = ${params.userId}`
      : sql`r.customer_id = ${params.userId}`;

  const bucketFilter =
    query.bucket === "active"
      ? sql`and r.status in ${sql(ACTIVE_STATUSES)}`
      : query.bucket === "waiting"
        ? sql`and r.status = 'waiting_for_customer'`
        : query.bucket === "completed"
          ? sql`and r.status in ${sql(CLOSED_STATUSES)}`
          : sql``;
  const searchPattern = query.search ? `%${query.search}%` : null;

  const rows = await sql<any[]>`
    select
      r.id, r.request_number, r.subject, r.issue_type, r.status, r.priority,
      r.customer_id, r.customer_machine_id, r.assigned_engineer_id,
      r.created_at, r.updated_at,
      m.display_label,
      a.assigned_at,
      (r.status in ${sql(ACTIVE_STATUSES)}
        and r.updated_at < now() - make_interval(days => ${query.staleAfterDays})) as stale
    from service_desk.requests r
    left join service_desk.customer_machines m on m.id = r.customer_machine_id
    left join lateral (
      select max(h.created_at) as assigned_at
      from service_desk.request_history h
      where h.request_id = r.id
        and h.event_type in ('request_assigned', 'request_reassigned', 'request_claimed')
    ) a on true
    where ${ownership}
      ${bucketFilter}
      ${
        searchPattern
          ? sql`and (
              r.request_number ilike ${searchPattern}
              or r.subject ilike ${searchPattern}
              or coalesce(r.issue_type::text, '') ilike ${searchPattern}
              or coalesce(m.display_label, '') ilike ${searchPattern}
              or r.priority::text ilike ${searchPattern}
              or r.status::text ilike ${searchPattern}
            )`
          : sql``
      }
      ${cursor ? sql`and (r.updated_at, r.id) < (${cursor.at}::timestamptz, ${cursor.id}::uuid)` : sql``}
    order by r.updated_at desc, r.id desc
    limit ${query.limit + 1}
  `;

  const hasMore = rows.length > query.limit;
  const page = hasMore ? rows.slice(0, query.limit) : rows;
  const last = page[page.length - 1];
  const now = Date.now();

  return {
    tasks: page.map((row) => {
      const createdAt = new Date(row.created_at);
      return {
        id: row.id,
        requestNumber: row.request_number,
        subject: row.subject,
        issueType: row.issue_type ?? null,
        status: row.status,
        priority: row.priority,
        customerId: row.customer_id,
        machineId: row.customer_machine_id ?? null,
        machineLabel: row.display_label ?? null,
        assignedEngineerId: row.assigned_engineer_id ?? null,
        assignedAt: row.assigned_at ? new Date(row.assigned_at).toISOString() : null,
        createdAt: createdAt.toISOString(),
        lastActivityAt: new Date(row.updated_at).toISOString(),
        ageDays: Math.max(0, Math.floor((now - createdAt.getTime()) / 86_400_000)),
        stale: Boolean(row.stale),
      };
    }),
    nextCursor: hasMore && last ? encodeCursor(last.updated_at, last.id) : null,
  };
});

// Issue-report routes live in their own module — this file is already large,
// and reports share no state with the request pipeline beyond the connection.
await registerReportRoutes(app);

const port = Number(new URL(env.SERVICE_DESK_URL).port || "4003");

if (!process.env.VERCEL) {
  app.listen({ port, host: "127.0.0.1" }).catch((error) => {
    app.log.error(error);
    process.exit(1);
  });
}

export default async function handler(req: any, res: any) {
  await app.ready();
  if (req.url?.startsWith('/api/internal-service-desk')) {
    req.url = req.url.replace('/api/internal-service-desk', '') || '/';
  }
  app.server.emit('request', req, res);
}
