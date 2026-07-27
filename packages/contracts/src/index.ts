import { z } from "zod";

export const roleSchema = z.enum(["customer", "engineer", "support", "owner", "admin"]);
export type Role = z.infer<typeof roleSchema>;

// ─── Role-based permission helpers ──────────────────────────────────────────
// Single source of truth for what each role may do. Imported by the gateway
// and services for *enforcement*, and by the web app for UI gating — so a
// hidden button always lines up with a backend 403. Never gate a sensitive
// action on UI alone; always call the matching helper on the backend too.
//
// Role overview:
//   admin    — highest system role; everything, including permanent deletion.
//   owner    — business operations; approve/suspend/assign roles (not admin),
//              assign requests, view activity. CANNOT permanently delete data.
//   support  — service operations; view activity, create requests for
//              customers, assign requests. CANNOT manage users.
//   engineer — handles assigned requests (unchanged).
//   customer — own portal data only (unchanged).

export const STAFF_ROLES = ["engineer", "support", "owner", "admin"] as const;

export function isAdmin(role: Role): boolean {
  return role === "admin";
}
export function isOwner(role: Role): boolean {
  return role === "owner";
}
export function isSupport(role: Role): boolean {
  return role === "support";
}

/** Permanent deletion / removal of user/customer data — admin only. */
export function canDeleteUsers(role: Role): boolean {
  return role === "admin";
}
/** Approve or reject pending accounts. */
export function canApproveUsers(role: Role): boolean {
  return role === "admin" || role === "owner";
}
/** Suspend or reactivate accounts. */
export function canSuspendUsers(role: Role): boolean {
  return role === "admin" || role === "owner";
}
/** Change another user's role (owner is further restricted, see below). */
export function canChangeRoles(role: Role): boolean {
  return role === "admin" || role === "owner";
}
/** See and use the Users management page at all. */
export function canManageUsers(role: Role): boolean {
  return role === "admin" || role === "owner";
}
/** Edit another user's profile/contact fields — currently Admin-only. */
export function canEditUserProfiles(role: Role): boolean {
  return role === "admin";
}
/** Operational management (customer machines, etc.). */
export function canManageOperational(role: Role): boolean {
  return role === "admin" || role === "owner";
}
/** Assign / reassign requests to engineers. */
export function canAssignRequests(role: Role): boolean {
  return role === "admin" || role === "owner" || role === "support";
}
/** Create a service request on behalf of a customer. */
export function canCreateRequestForCustomer(role: Role): boolean {
  return role === "admin" || role === "owner" || role === "support";
}
/** View the customer-activity and support operations dashboards. */
export function canViewCustomerActivity(role: Role): boolean {
  return role === "admin" || role === "owner" || role === "support";
}
export function canViewSupportDashboard(role: Role): boolean {
  return role === "admin" || role === "owner" || role === "support";
}
/** Access the system Admin panel (health, dangerous system controls). */
export function canAccessAdminPanel(role: Role): boolean {
  return role === "admin";
}

/** Primary portal destination after authentication or when opening `/app`. */
export function portalHomePathForRole(
  role: Role,
): "/app/admin" | "/app/requests" | "/app/queue" {
  if (role === "admin") return "/app/admin";
  if (role === "customer") return "/app/requests";
  return "/app/queue";
}

/* ── Issue reports ─────────────────────────────────────────────────────────
 * Customer submission and customer-owned history remain available through
 * their dedicated routes. Every staff console, data and management permission
 * is intentionally Admin-only until the product explicitly expands access.
 */

/** Anyone signed in may file a report about the platform. */
export function canSubmitReport(_role: Role): boolean {
  return true;
}
/** See every report, regardless of assignment. */
export function canViewAllReports(role: Role): boolean {
  return role === "admin";
}
/** Reach the staff Issue Reports console at all. */
export function canViewReports(role: Role): boolean {
  return role === "admin";
}
/** Change status, add internal notes, record a resolution, link a request. */
export function canManageReports(role: Role): boolean {
  return role === "admin";
}
/** Assign or reassign a report to a staff member. */
export function canAssignReports(role: Role): boolean {
  return role === "admin";
}
/** Take a resolved report back into Working. */
export function canReopenReport(role: Role): boolean {
  return role === "admin";
}
/** Turn a reporter reference back into an account. The report UI itself stays
 *  anonymous for everyone; this is the deliberate, audited escape hatch. */
export function canIdentifyReporter(role: Role): boolean {
  return role === "admin";
}

/** Roles `actor` is allowed to assign to other users. Owner can never grant admin. */
export function assignableRolesFor(actor: Role): Role[] {
  if (actor === "admin") return ["customer", "engineer", "support", "owner", "admin"];
  if (actor === "owner") return ["customer", "engineer", "support", "owner"];
  return [];
}

/**
 * Whether `actorRole` may modify (role change / approve / suspend) a user who
 * currently has `targetRole`. Owners must never touch admin accounts.
 */
export function canManageTargetUser(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === "admin") return true;
  if (actorRole === "owner") return targetRole !== "admin";
  return false;
}

/**
 * Whether an existing account may move between two roles. Customer identities
 * are deliberately isolated from staff identities: converting in either
 * direction would carry customer-owned data across a privilege boundary.
 * Create a separate account through the invitation flow instead.
 */
export function canChangeUserRole(
  actorRole: Role,
  currentRole: Role,
  nextRole: Role,
): boolean {
  if (!canChangeRoles(actorRole)) return false;
  if (currentRole === "customer" || nextRole === "customer") return false;
  if (currentRole === nextRole) return false;
  if (!canManageTargetUser(actorRole, currentRole)) return false;
  return assignableRolesFor(actorRole).includes(nextRole);
}

export const requestPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);
export type RequestPriority = z.infer<typeof requestPrioritySchema>;

export const requestStatusSchema = z.enum([
  "new",
  "triaged",
  "assigned",
  "in_progress",
  "waiting_for_customer",
  "resolved",
  "closed",
]);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const messageVisibilitySchema = z.enum(["customer_visible", "internal_note"]);
export type MessageVisibility = z.infer<typeof messageVisibilitySchema>;

export const productSpecSchema = z.tuple([z.string(), z.string()]);
export type ProductSpec = z.infer<typeof productSpecSchema>;

export const catalogProductSchema = z.object({
  id: z.string(),
  categorySlug: z.string(),
  slug: z.string(),
  name: z.string(),
  priceDisplay: z.string(),
  brochureUrl: z.string().url().optional(),
  images: z.array(z.string()),
  specs: z.array(productSpecSchema),
  highlights: z.array(z.string()),
});
export type CatalogProduct = z.infer<typeof catalogProductSchema>;

export const catalogCategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  routePath: z.string(),
  name: z.string(),
  intro: z.string(),
  products: z.array(catalogProductSchema),
});
export type CatalogCategory = z.infer<typeof catalogCategorySchema>;

export const approvalStatusSchema = z.enum([
  "pending_approval",
  "approved",
  "rejected",
  "suspended",
]);
export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;

export const accountOriginSchema = z.enum([
  "self_signup",
  "admin_invite",
  "firebase_google",
  "legacy",
]);
export type AccountOrigin = z.infer<typeof accountOriginSchema>;

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  displayName: z.string(),
  role: roleSchema,
  emailVerified: z.boolean(),
  approvalStatus: approvalStatusSchema,
  accountOrigin: accountOriginSchema.default("self_signup"),
  // Whether the customer has completed their service profile. Drives the
  // onboarding gate. Defaults true so legacy/older session payloads (and
  // staff accounts, which are never gated) parse cleanly.
  profileCompleted: z.boolean().default(true),
  createdAt: z.string(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

export const productSnapshotSchema = z.object({
  id: z.string(),
  categorySlug: z.string(),
  slug: z.string(),
  name: z.string(),
  priceDisplay: z.string(),
});
export type ProductSnapshot = z.infer<typeof productSnapshotSchema>;

export const serviceRequestSchema = z.object({
  id: z.string(),
  requestNumber: z.string(),
  customerId: z.string(),
  productId: z.string(),
  productSnapshot: productSnapshotSchema,
  // Link to the customer machine this request was raised against. Null for
  // legacy/admin requests created before the customer-machine model existed.
  customerMachineId: z.string().nullable().optional(),
  // Simple, customer-chosen issue category. Null on legacy requests.
  issueType: z.string().nullable().optional(),
  subject: z.string(),
  description: z.string(),
  contactPhone: z.string(),
  siteLocation: z.string(),
  // Internal/admin-only on the customer-machine model. The service-desk
  // detail endpoint nulls this out for the customer role.
  serialNumber: z.string().nullable().optional(),
  priority: requestPrioritySchema,
  status: requestStatusSchema,
  assignedEngineerId: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ServiceRequest = z.infer<typeof serviceRequestSchema>;

// ─── Simple issue categories (customer-facing, workshop-friendly) ───────────
export const issueTypeSchema = z.enum([
  "not_turning_on",
  "printing_issue",
  "ink_issue",
  "media_feed_issue",
  "software_settings_issue",
  "noise_vibration",
  "maintenance_service",
  "other",
]);
export type IssueType = z.infer<typeof issueTypeSchema>;

/** Plain-language labels for each issue type. Shared so the customer chips,
 *  the auto-generated subject, and the staff detail view all read the same. */
export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  not_turning_on: "Not turning on",
  printing_issue: "Printing issue",
  ink_issue: "Ink issue",
  media_feed_issue: "Media / feed issue",
  software_settings_issue: "Software / settings issue",
  noise_vibration: "Noise / vibration",
  maintenance_service: "Maintenance / service",
  other: "Other",
};

export const requestMessageSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  authorId: z.string(),
  authorRole: roleSchema,
  // Display-only enrichment. Server fills these when looking up the author
  // is safe; the UI falls back gracefully when they're missing so older
  // payloads still render.
  authorDisplayName: z.string().optional().nullable(),
  authorEmail: z.string().optional().nullable(),
  visibility: messageVisibilitySchema,
  body: z.string(),
  createdAt: z.string(),
});
export type RequestMessage = z.infer<typeof requestMessageSchema>;

/** Light-weight participant info returned alongside a request detail
 *  payload — lets the UI show "Assigned to <name>" without doing its
 *  own admin-users query (which only admins are allowed to make). */
export const requestParticipantSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  role: roleSchema,
});
export type RequestParticipant = z.infer<typeof requestParticipantSchema>;

export const signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  inviteToken: z.string().optional(),
});

export const loginInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const forgotPasswordInputSchema = z.object({
  email: z.string().email(),
});

export const updateProfileInputSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const resetPasswordInputSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

export const verifyEmailInputSchema = z.object({
  token: z.string().min(20),
});

export const inviteUserInputSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2),
  role: roleSchema,
});

export const changeUserRoleInputSchema = z.object({
  role: roleSchema,
});

export const createServiceRequestInputSchema = z.object({
  productId: z.string(),
  subject: z.string().min(4),
  description: z.string().min(10),
  contactPhone: z.string().min(7),
  siteLocation: z.string().min(2),
  serialNumber: z.string().optional(),
  priority: requestPrioritySchema.default("normal"),
});

export const updateServiceRequestInputSchema = z
  .object({
    subject: z.string().trim().min(4).optional(),
    description: z.string().trim().min(10).optional(),
    contactPhone: z.string().trim().min(7).optional(),
    siteLocation: z.string().trim().min(2).optional(),
    serialNumber: z.string().trim().max(100).nullable().optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one request detail must be provided.",
  });

export const createRequestMessageInputSchema = z.object({
  body: z.string().min(1),
  visibility: messageVisibilitySchema,
});

export const assignRequestInputSchema = z.object({
  engineerId: z.string(),
});

export const updateRequestStatusInputSchema = z.object({
  status: requestStatusSchema,
  note: z.string().max(1000).optional(),
  visibility: messageVisibilitySchema.optional(),
});

export const cancelRequestInputSchema = z.object({
  reason: z.string().max(1000).optional(),
});

// ─── Customer service profile ───────────────────────────────────────────────
// Who the customer is and where their workshop is. Admin-controlled machine
// ownership is modelled separately (customerMachineSchema) and never mixed in.
export const customerProfileSchema = z.object({
  displayName: z.string(),
  companyName: z.string().nullable().optional(),
  contactPhone: z.string().nullable().optional(),
  alternatePhone: z.string().nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  profileCompleted: z.boolean(),
  profileCompletedAt: z.string().nullable().optional(),
});
export type CustomerProfile = z.infer<typeof customerProfileSchema>;

// ─── Scalable customer picker ───────────────────────────────────────────────
// Machine linking and other operational flows use this deliberately small
// projection instead of downloading every AuthUser and filtering in React.
export const CUSTOMER_PICKER_MIN_SEARCH_LENGTH = 2;
export const CUSTOMER_PICKER_PAGE_SIZE_DEFAULT = 15;
export const CUSTOMER_PICKER_PAGE_SIZE_MAX = 20;

export const customerPickerQuerySchema = z
  .object({
    search: z
      .string()
      .trim()
      .min(CUSTOMER_PICKER_MIN_SEARCH_LENGTH)
      .max(120)
      .optional(),
    customerId: z.string().uuid().optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(CUSTOMER_PICKER_PAGE_SIZE_MAX)
      .default(CUSTOMER_PICKER_PAGE_SIZE_DEFAULT),
    cursor: z.string().max(200).optional(),
  })
  .refine((query) => Boolean(query.search || query.customerId), {
    message: "Search or customerId is required.",
  });
export type CustomerPickerQuery = z.infer<typeof customerPickerQuerySchema>;

export const customerPickerCustomerSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  email: z.string().email(),
  companyName: z.string().nullable(),
  approvalStatus: approvalStatusSchema,
  profileCompleted: z.boolean(),
});
export type CustomerPickerCustomer = z.infer<typeof customerPickerCustomerSchema>;

export const customerPickerResponseSchema = z.object({
  customers: z.array(customerPickerCustomerSchema),
  nextCursor: z.string().nullable(),
});
export type CustomerPickerResponse = z.infer<typeof customerPickerResponseSchema>;

// Onboarding form — all required fields must be present to mark the profile
// complete. Optional fields may be omitted entirely (the frontend drops empty
// strings rather than sending them).
export const completeProfileInputSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  companyName: z.string().trim().min(1).max(120),
  contactPhone: z.string().trim().min(7).max(30),
  alternatePhone: z.string().trim().max(30).optional(),
  addressLine1: z.string().trim().min(3).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().min(1).max(80),
  postalCode: z.string().trim().max(20).optional(),
  country: z.string().trim().max(80).optional(),
});
export type CompleteProfileInput = z.infer<typeof completeProfileInputSchema>;

// Admin partial edit of a customer's profile — every field optional.
export const adminUpdateProfileInputSchema = completeProfileInputSchema
  .partial()
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one profile field must be provided.",
  });
export type AdminUpdateProfileInput = z.infer<typeof adminUpdateProfileInputSchema>;

// ─── Customer machines (admin-controlled physical assets) ───────────────────
export const customerMachineStatusSchema = z.enum(["active", "inactive"]);
export type CustomerMachineStatus = z.infer<typeof customerMachineStatusSchema>;

/** Full machine record — admin/engineer view. Includes the internal serial. */
export const customerMachineSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  productId: z.string(),
  productSnapshot: productSnapshotSchema,
  displayLabel: z.string(),
  unitNumber: z.string().nullable().optional(),
  internalSerialNumber: z.string().nullable().optional(),
  siteName: z.string().nullable().optional(),
  siteLocation: z.string(),
  contactPhone: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  installDate: z.string().nullable().optional(),
  status: customerMachineStatusSchema,
  notes: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomerMachine = z.infer<typeof customerMachineSchema>;

/** Customer-safe machine view. No internal serial, notes, or admin metadata —
 *  only what the customer needs to pick the right machine on a request. */
export const customerMachinePublicSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  displayLabel: z.string(),
  unitNumber: z.string().nullable().optional(),
  siteName: z.string().nullable().optional(),
  siteLocation: z.string(),
  contactPhone: z.string().nullable().optional(),
  status: customerMachineStatusSchema,
});
export type CustomerMachinePublic = z.infer<typeof customerMachinePublicSchema>;

export const createCustomerMachineInputSchema = z.object({
  productId: z.string().min(1),
  displayLabel: z.string().trim().min(1).max(120).optional(),
  unitNumber: z.string().trim().max(40).optional(),
  internalSerialNumber: z.string().trim().max(120).optional(),
  siteName: z.string().trim().max(120).optional(),
  // Optional: when omitted, the backend falls back to the customer's saved
  // profile address. Only an admin "different installation site" override
  // sends an explicit value.
  siteLocation: z.string().trim().min(2).max(200).optional(),
  contactPhone: z.string().trim().max(30).optional(),
  purchaseDate: z.string().trim().max(20).optional(),
  installDate: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateCustomerMachineInput = z.infer<typeof createCustomerMachineInputSchema>;

// Admin links a machine to a chosen customer from the global machines
// dashboard — same fields as createCustomerMachineInputSchema plus the target
// customer. (The per-user route carries the customer in the URL instead.)
export const adminLinkMachineInputSchema = createCustomerMachineInputSchema.extend({
  customerId: z.string().uuid(),
});
export type AdminLinkMachineInput = z.infer<typeof adminLinkMachineInputSchema>;

// Filters for the admin customer-machines list endpoint.
export const adminMachineListQuerySchema = z.object({
  customerId: z.string().uuid().optional(),
  productId: z.string().optional(),
  status: customerMachineStatusSchema.optional(),
});
export type AdminMachineListQuery = z.infer<typeof adminMachineListQuerySchema>;

export const updateCustomerMachineInputSchema = z
  .object({
    displayLabel: z.string().trim().min(1).max(120).optional(),
    unitNumber: z.string().trim().max(40).nullable().optional(),
    internalSerialNumber: z.string().trim().max(120).nullable().optional(),
    siteName: z.string().trim().max(120).nullable().optional(),
    siteLocation: z.string().trim().min(2).max(200).optional(),
    contactPhone: z.string().trim().max(30).nullable().optional(),
    purchaseDate: z.string().trim().max(20).nullable().optional(),
    installDate: z.string().trim().max(20).nullable().optional(),
    status: customerMachineStatusSchema.optional(),
    notes: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((input) => Object.values(input).some((value) => value !== undefined), {
    message: "At least one machine field must be provided.",
  });
export type UpdateCustomerMachineInput = z.infer<typeof updateCustomerMachineInputSchema>;

// ─── Customer-facing "create request" (machine-based, simplified) ───────────
// The customer never types product, serial, or site location — those are
// derived server-side from the selected machine. Subject is auto-generated.
export const createCustomerRequestInputSchema = z.object({
  customerMachineId: z.string().uuid(),
  issueType: issueTypeSchema,
  description: z.string().trim().min(5).max(5000),
  // Workshop-friendly urgency maps onto the existing priority enum: the form
  // only offers "normal" and "urgent".
  priority: requestPrioritySchema.default("normal"),
  // Optional override; defaults to the machine's contact phone, then the
  // customer profile phone.
  contactPhone: z.string().trim().min(7).max(30).optional(),
  // Admin-on-behalf: when present the backend asserts the machine belongs to
  // this customer. Customers omit it (their own id is used).
  customerId: z.string().uuid().optional(),
});
export type CreateCustomerRequestInput = z.infer<typeof createCustomerRequestInputSchema>;

// ─── Request attachments (photo/video evidence stored in Cloudflare R2) ─────
export const attachmentKindSchema = z.enum(["image", "video"]);
export type AttachmentKind = z.infer<typeof attachmentKindSchema>;

export const requestAttachmentSchema = z.object({
  id: z.string(),
  requestId: z.string(),
  // Present when the attachment was uploaded with a customer-visible
  // conversation update. Older request-level attachments may not have one.
  messageId: z.string().optional().nullable(),
  uploadedBy: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  kind: attachmentKindSchema,
  // Short-lived signed (or public) read URL, derived from the object key at
  // read time. Never persisted.
  url: z.string(),
  createdAt: z.string(),
});
export type RequestAttachment = z.infer<typeof requestAttachmentSchema>;

// Step 1: client asks the server for a presigned upload target.
export const presignAttachmentInputSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive(),
  visibility: messageVisibilitySchema.default("customer_visible"),
});
export type PresignAttachmentInput = z.infer<typeof presignAttachmentInputSchema>;

export const attachmentUploadTicketSchema = z.object({
  uploadUrl: z.string(),
  objectKey: z.string(),
  // Headers the browser must send on the direct-to-R2 PUT.
  headers: z.record(z.string()),
  maxBytes: z.number(),
});
export type AttachmentUploadTicket = z.infer<typeof attachmentUploadTicketSchema>;

// Step 2: after the direct upload succeeds, client persists the metadata.
export const confirmAttachmentInputSchema = z.object({
  objectKey: z.string().trim().min(1).max(512),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().positive(),
  visibility: messageVisibilitySchema.default("customer_visible"),
  messageId: z.string().uuid().optional(),
});
export type ConfirmAttachmentInput = z.infer<typeof confirmAttachmentInputSchema>;

export const requestStatusGroupSchema = z.enum([
  "all",
  "open",
  "in_progress",
  "pending",
  "resolved",
  "archived",
]);
export type RequestStatusGroup = z.infer<typeof requestStatusGroupSchema>;

export const sessionResponseSchema = z.object({
  sessionToken: z.string(),
  csrfToken: z.string(),
  user: authUserSchema,
});

export const oauthFindOrCreateInputSchema = z.object({
  provider: z.literal("google"),
  providerUserId: z.string().min(1),
  providerEmail: z.string().email(),
  emailVerified: z.boolean(),
  displayName: z.string().min(1),
  inviteToken: z.string().optional(),
});

export const firebaseSessionInputSchema = z.object({
  idToken: z.string().min(20),
});

export const firebaseSessionRequestSchema = z.object({
  firebaseUid: z.string().min(1),
  email: z.string().email(),
  emailVerified: z.boolean(),
  displayName: z.string().min(1),
  provider: z.enum(["password", "google.com", "other"]).default("other"),
  pictureUrl: z.string().url().optional(),
});

export const approvalActionInputSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const serviceHeartbeatSchema = z.object({
  service: z.string(),
  status: z.enum(["healthy", "degraded", "down"]),
  latencyMs: z.number().nullable(),
  checkedAt: z.string(),
  details: z
    .object({
      version: z.string().optional(),
      environment: z.string().optional(),
      message: z.string().optional(),
    })
    .optional(),
});
export type ServiceHeartbeat = z.infer<typeof serviceHeartbeatSchema>;

export const adminApprovalErrorCodeSchema = z.enum([
  "USER_PENDING_APPROVAL",
  "USER_REJECTED",
  "USER_SUSPENDED",
]);
export type AdminApprovalErrorCode = z.infer<typeof adminApprovalErrorCodeSchema>;

export const catalogSeedData = [
  {
    id: "cat-solvent-printers",
    slug: "solvent-printers",
    routePath: "/solvent-printers",
    name: "Solvent Printers",
    intro:
      "Providing you the best range of Gongzheng GZM3202ET Solvent Inkjet Printer, Gongzheng C3202SG Starfire Solvent Inkjet Printer, Allwin A180 Epson 13200 Eco Solvent Printer and Gongzheng GZM3204SG Starfire Solvent Inkjet Printer with effective & timely delivery.",
    products: [
      {
        id: "gzm3202et",
        categorySlug: "solvent-printers",
        slug: "gongzheng-gzm3202et-solvent-inkjet-printer",
        name: "Gongzheng GZM3202ET Solvent Inkjet Printer",
        priceDisplay: "₹ 18,00,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+GZM3202ET+Solvent+Inkjet+Printer+-+PDF+Catalogue.pdf",
        images: [
          "/images/Gongzheng GZM3202ET Solvent Inkjet Printer/1.webp",
          "/images/Gongzheng GZM3202ET Solvent Inkjet Printer/3.webp",
          "/images/Gongzheng GZM3202ET Solvent Inkjet Printer/5.webp",
        ],
        specs: [
          ["Printing Width", "3200 mm"],
          ["Data Interface", "External: Ethernet; Internal: Fiber Optical"],
          ["Drying System", "Pre, Mid, Post and Extended Heater + Intelligent IR Drying System"],
          ["Working Environment", "Temp. 23℃~29℃, Humidity: 50%~80%"],
          ["Model", "GZM3202ET"],
          ["Brand", "Gongzheng"],
          ["Print Head", "4 Epson T3200-U3-S Print Heads / 2 Epson T3200-U3-S Print Heads"],
          ["Ink Supply System", "GnTek Negative Pressure Recirculation System"],
          ["Media Type", "Banner, Frontlit, Backlit, Vinyl, Film..."],
          ["Printing Speed", "300x1800dpi 60㎡/h"],
          ["Power", "50Hz / AC, 220V+10% 10A(Printer) + 31A(IR Drying System)"],
          ["Gross Weight", "1924 KGS"],
          ["Type", "Eco Solvent"],
          ["Voltage", "220 V"],
        ],
        highlights: [
          "GnTek Negative Pressure Recirculation System",
          "Accurate Pneumatic Shaft Taking Up",
          "Intelligent Energy-Saving IR Drier",
          "High Speed, Photo-Quality Print",
          "Reinforced Structure with High Stability",
          "Revolutionary Print Head with Heater Integrated",
        ],
      },
      {
        id: "c3202sg",
        categorySlug: "solvent-printers",
        slug: "gongzheng-c3202sg-starfire-solvent-inkjet-printer",
        name: "Gongzheng C3202SG Starfire Solvent Inkjet Printer",
        priceDisplay: "₹ 13,00,000/Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+C3202SG+Starfire+Solvent+Inkjet+Printer+-+PDF+Catalogue.pdf",
        images: [
          "/images/Gongzheng C3202SG Starfire Solvent Inkjet Printer/2-1.webp",
          "/images/Gongzheng C3202SG Starfire Solvent Inkjet Printer/2-2.webp",
          "/images/Gongzheng C3202SG Starfire Solvent Inkjet Printer/2-3.webp",
          "/images/Gongzheng C3202SG Starfire Solvent Inkjet Printer/2-4.webp",
        ],
        specs: [
          ["Printing Width", "3200 mm"],
          ["Type", "Eco Solvent"],
          ["Media Type", "Banner, Frontlit, Backlit, Viny, Film..."],
          ["Data Interface", "External: USB2.0; Internal: High-Speed SCSI"],
          ["Brand/Make", "Gongzheng"],
          ["Model/Type", "C3202SG"],
          ["Working Environment", "Temp. 23℃~29℃, Humidity: 50%~80%"],
          ["Voltage", "220 V"],
          ["Drying System", "Pre, Mid, Post and Extended Heater Plus Smart IR Drier"],
          ["Print Head", "2 Starfire 1024"],
          ["Ink Supply System", "Gntek Negative Pressure Recirculation System"],
          ["Feeding System", "Automatic Media Feeding and Taking up System with Air Shaft"],
          ["Printing Speed", "300x400dpi 129㎡/h"],
          ["Gross Weight", "1150KGS"],
        ],
        highlights: [
          "Maximum Four Print Heads in Staggered Way",
          "Extreme Speed Up to 234㎡/h",
          "Durable 400w Ac Servo System",
          "More Precise Carriage Belt System",
          "Gntek Negative Pressure Recirculation System",
          "Smart Energy-saving Ir Dryer",
          "Dismountable Design for Low Transportation Cost!",
        ],
      },
      {
        id: "allwin-a180",
        categorySlug: "solvent-printers",
        slug: "allwin-a180-epson-13200-eco-solvent-printer",
        name: "Allwin A180 Epson 13200 Eco Solvent Printer",
        priceDisplay: "₹ 4,00,000/Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+A180+Epson+13200+Eco+Solvent+Printer+-+PDF+Catalogue.pdf",
        images: [
          "/images/Allwin A180 Epson 13200 Eco Solvent Printer/3-1.webp",
          "/images/Allwin A180 Epson 13200 Eco Solvent Printer/3-2.webp",
        ],
        specs: [
          ["Printing Width", "31 m"],
          ["Type", "Eco Solvent"],
          ["Brand/Make", "Allwin"],
          ["Model/Type", "A180"],
          ["Maximum Resolution", "1440 dpi"],
        ],
        highlights: [
          "Suitable for i3200 head or DX5 head",
          "Silent guide rail, high precision and stable operation, to ensure perfect printing quality",
          "All aluminum platform, high precision and durability",
          "Standard equipped infrared heating + air drying system",
          "Standard equipped feeding and collecting system.",
        ],
      },
      {
        id: "gzm3204sg",
        categorySlug: "solvent-printers",
        slug: "gongzheng-gzm3204sg-starfire-solvent-inkjet-printer",
        name: "Gongzheng GZM3204SG Starfire Solvent Inkjet Printer",
        priceDisplay: "₹ 17,50,000/Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+GZM3204SG+Starfire+Solvent+Inkjet+Printer+-+PDF+Catalogue.pdf",
        images: ["/images/Gongzheng GZM3204SG Starfire Solvent Inkjet Printer/4-1.webp"],
        specs: [
          ["Printing Width", "3200 mm"],
          ["Type", "Eco Solvent"],
          ["Media Type", "Banner, Frontlit, Backlit, Vinyl, Film"],
          ["Data Interface", "External: USB 2.0, Internal: High-Speed SCSI"],
          ["Brand / Make", "Gongzheng"],
          ["Model / Type", "GZM3204SG"],
          ["Working Environment", "23–29°C, 50–80% Humidity"],
          ["Voltage", "220 V"],
          ["Drying System", "Pre, Mid, Post & Extended Heater + Intelligent IR"],
          ["Printhead", "4 × Starfire 1024 (25pl)"],
          ["Ink Supply System", "Gntek Negative Pressure Recirculation"],
          ["Feeding System", "Automatic Media Feeding & Take-up (Pneumatic Shaft)"],
          ["Printing Speed", "300×400 dpi — 229 m²/h"],
          ["Gross Weight", "1345 kg"],
        ],
        highlights: [
          "Extreme speed up to 229㎡/h",
          "Enhanced rigid body for higher precision and durability",
          "Upgraded 400W AC servo drive system",
          "Gntek negative pressure ink recirculation system",
          "Intelligent energy-saving thermal drying system",
          "Advanced color management software",
          "Optional separate take-up system",
          "Optional mesh printing kit",
        ],
      },
    ],
  },
  {
    id: "cat-uv-printers",
    slug: "uv-printers",
    routePath: "/uv-printers",
    name: "UV Printers",
    intro:
      "Offering you a complete choice of products which include Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer, Allwin Giant Hybrid UV Printer and Allwin 3.2 Double Rows Pinch Roller UV Printer.",
    products: [
      {
        id: "dc1800uv",
        categorySlug: "uv-printers",
        slug: "gongzheng-dc1800uv-mesh-belt-1-8m-uv-inkjet-printer",
        name: "Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer",
        priceDisplay: "₹ 14,00,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+DC1800UV+Mesh+Belt+1.8M+UV+Inkjet+Printer+-+PDF+Catalogue.pdf",
        images: [
          "/images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-1.webp",
          "/images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-2.webp",
          "/images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-3.webp",
          "/images/Gongzheng DC1800UV Mesh Belt 1.8M UV Inkjet Printer/5-4.webp",
        ],
        specs: [
          ["Usage/Application", "Roll: Ceiling Film, Vinyl, Backlit, Fabric, Wall paper, Leather, etc. Flat: PVC board, Foam board"],
          ["Printing Width (mm)", "1800 mm"],
          ["Ink Type", "Flexible UV Ink"],
          ["Brand", "Gongzheng"],
          ["Print Head", "8"],
          ["Weight", "1366 kgs"],
          ["Power Consumption", "Single phase, 50Hz/AC, 220V±10%, 5A (Printer + UV Controller)"],
          ["Model", "ThunderJet DC1800UV"],
          ["Ink Tank", "1000 ml"],
          ["Roll Diameter", "Max. 300 mm"],
          ["Roll Weight", "Max. 50 kgs"],
          ["Printing Speed", "720×1800 dpi"],
        ],
        highlights: [
          "Mesh Belt System",
          "Multi-layer Printing Application",
          "White Ink Recirculation System",
          "Intelligent Heating Unit",
        ],
      },
      {
        id: "allwin-giant-hybrid",
        categorySlug: "uv-printers",
        slug: "allwin-giant-hybrid-uv-printer",
        name: "Allwin Giant Hybrid UV Printer",
        priceDisplay: "₹ 35,00,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+Giant+Hybrid+UV+Printer+-+PDF+Catalogue.pdf",
        images: [
          "/images/Allwin Giant Hybrid UV Printer/6-1.webp",
          "/images/Allwin Giant Hybrid UV Printer/6-2.webp",
        ],
        specs: [
          ["Usage/Application", "Posters Printing"],
          ["Printing Width", "6.6 m"],
          ["Print Resolution", "2160 dpi"],
          ["Print Speed", "235 m2/h"],
          ["Printheads", "40"],
          ["Printhead Cleaning System", "Automatic"],
          ["Voltage", "440 V"],
          ["Power", "10 kW"],
        ],
        highlights: [
          "6.6m ultra-wide production",
          "2160 dpi output",
          "235 m2/h speed",
          "Automatic printhead cleaning",
        ],
      },
      {
        id: "allwin-3-2-pinch-roller",
        categorySlug: "uv-printers",
        slug: "allwin-3-2-double-rows-pinch-roller-uv-printer",
        name: "Allwin 3.2 Double Rows Pinch Roller UV Printer",
        priceDisplay: "₹ 21,00,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+3.2+Double+Rows+Pinch+Roller+UV+Printer+-+PDF+Catalogue.pdf",
        images: [
          "/images/Allwin 3.2 Double Rows Pinch Roller UV Printer/7-1.webp",
          "/images/Allwin 3.2 Double Rows Pinch Roller UV Printer/7-2.webp",
        ],
        specs: [
          ["Usage/Application", "Posters Printing"],
          ["Printing Width (mm)", "3.2 m"],
          ["Ink Type", "UV Ink"],
          ["Brand", "Allwin"],
          ["Print Head", "KONICA10241-6PL / 10241-13PL / 1024A"],
          ["Weight", "1135 kg"],
          ["Power Consumption", "220 VAC, 50 Hz"],
          ["Printing Resolution", "2160 dpi"],
        ],
        highlights: [
          "3.2m width for large media",
          "Konica head options",
          "2160 dpi resolution",
          "Production-ready UV workflow",
        ],
      },
    ],
  },
  {
    id: "cat-laser-cutting-machines",
    slug: "laser-cutting-machines",
    routePath: "/laser-cutting-machines",
    name: "Laser Cutting Machines",
    intro: "We are a leading wholesaler of 1325CCD Laser Engraving Cutting Machine from Ahmedabad, India.",
    products: [
      {
        id: "1325ccd",
        categorySlug: "laser-cutting-machines",
        slug: "1325ccd-laser-engraving-cutting-machine",
        name: "1325CCD Laser Engraving Cutting Machine",
        priceDisplay: "₹ 6,50,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/1325CCD+Laser+Engraving+Cutting+Machine+-+PDF+Catalogue.pdf",
        images: [
          "/images/1325CCD Laser Engraving Cutting Machine/8-1.webp",
          "/images/1325CCD Laser Engraving Cutting Machine/8-2.webp",
        ],
        specs: [
          ["Laser Power", "180 W"],
          ["Model Name/Number", "1325CCD"],
          ["Size", "1300 × 2500 mm"],
          ["Compatible Software", "CorelDRAW, Photoshop, AutoCAD"],
          ["Net Weight", "750 KG"],
          ["Working Area", "1300 × 2500 mm"],
          ["Laser Tube", "Sealed CO₂ Laser Tube (150–180W)"],
          ["Controller", "Ruida Controller"],
          ["Recognition System", "CCD High Precision Visual Recognition System"],
          ["Worktable", "Knife Blade Worktable"],
          ["Cooling", "Water Cooling & Protection System (Chiller)"],
          ["Drive System", "X with Belt, Y with Rack & Pinion"],
          ["Graphic Format Support", "BMP, PLT, DXI, AI"],
        ],
        highlights: [
          "1300 × 2500 mm working area",
          "Knife blade worktable",
          "Sealed CO₂ laser tube (150–180W)",
          "Water cooling & protection chiller",
          "Ruida controller",
          "CCD visual recognition system",
          "Air pump + exhaust fan included",
          "Supports CorelDRAW / Photoshop / AutoCAD",
          "Formats: BMP, PLT, DXI, AI",
          "X belt drive + Y rack & pinion",
          "Net weight: 750 KG",
        ],
      },
    ],
  },
  {
    id: "cat-lamination-machines",
    slug: "lamination-machines",
    routePath: "/lamination-machines",
    name: "Lamination Machines",
    intro:
      "Leading Wholesaler of Molor ML1600K Cold Heat Lamination Machine and Inca L4-1700 Electric Laminating Machine from Ahmedabad.",
    products: [
      {
        id: "molor-ml1600k",
        categorySlug: "lamination-machines",
        slug: "molor-ml1600k-cold-heat-lamination-machine",
        name: "Molor ML1600K Cold Heat Lamination Machine",
        priceDisplay: "₹ 1,25,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Molor+ML1600K+Cold+Heat+Lamination+Machine%2C+1630mm+(64+Inch)+-+PDF+Catalogue.pdf",
        images: [
          "/images/Molor ML1600K Cold Heat Lamination Machine/9-1.webp",
          "/images/Molor ML1600K Cold Heat Lamination Machine/9-2.webp",
          "/images/Molor ML1600K Cold Heat Lamination Machine/9-3.webp",
          "/images/Molor ML1600K Cold Heat Lamination Machine/9-4.webp",
        ],
        specs: [
          ["Lamination Width", "1630 mm (64 Inch)"],
          ["Roller Type", "Silicone Rollers"],
          ["Feeding Mechanism", "Manual"],
          ["Model", "ML1600K"],
          ["Brand", "Molor"],
          ["Lamination Thickness", "35 mm (1.4 Inch)"],
          ["Voltage", "240 V"],
          ["Weight", "230 Kgs"],
          ["Preheating Time", "10 min"],
          ["Roller Lifting", "Air cylinder"],
        ],
        highlights: [
          "Durable laminator designed to reduce material cost and improve efficiency",
          "Works with post-printing materials, rigid displays, packing board, car wrapping, graphics, banners",
          "Compatible with common cold laminating films (bottom paper, bottom-free paper, polymer film)",
          "Heated upper roller (up to 60°C) for better lamination in low temp environments",
        ],
      },
      {
        id: "inca-l4-1700",
        categorySlug: "lamination-machines",
        slug: "inca-l4-1700-electric-laminating-machine",
        name: "Inca L4-1700 Electric Laminating Machine",
        priceDisplay: "₹ 17,00,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Automatic+Inca+L4-1700+Electric+Laminating+Machine+-+PDF+Catalogue.pdf",
        images: [
          "/images/Inca L4-1700 Electric Laminating Machine/10-1.webp",
          "/images/Inca L4-1700 Electric Laminating Machine/10-2.webp",
          "/images/Inca L4-1700 Electric Laminating Machine/10-3.webp",
        ],
        specs: [
          ["Automation Grade", "Automatic"],
          ["Number Of Rollers", "1"],
          ["Max Speed", "24 m/min"],
          ["Max Width", "1630 mm / 64 in."],
          ["Lifting Height", "40 mm / 1.5 in."],
          ["Motor Type", "250W motor"],
          ["Silicone Roller", "120 mm / 4.7 in."],
          ["Cutter Type", "4 ceramic knives (knob control)"],
          ["Pedal Type", "2 multi-functional foot pedal"],
          ["Winding Diameter", "200 mm / 8 in."],
          ["Model", "L4-1700"],
          ["Transmission", "Chain drive"],
        ],
        highlights: [
          "Automatic laminating workflow for consistent output",
          "High speed (up to 24 m/min) for production environments",
          "Integrated cutter + foot pedal controls",
          "Wide format (64 in.) support",
        ],
      },
    ],
  },
  {
    id: "cat-desktop-uv-printer",
    slug: "desktop-uv-printer",
    routePath: "/desktop-uv-printer",
    name: "Desktop UV Printer",
    intro: "Providing you the best range of Gongzheng A3 HD Desktop UV Printer with effective & timely delivery.",
    products: [
      {
        id: "gongzheng-a3hd",
        categorySlug: "desktop-uv-printer",
        slug: "gongzheng-a3-hd-desktop-uv-printer",
        name: "Gongzheng A3 HD Desktop UV Printer",
        priceDisplay: "₹ 7,00,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Gongzheng+A3+HD+Desktop+UV+Printer+-+PDF+Catalogue.pdf",
        images: [
          "/images/Gongzheng A3 HD Desktop UV Printer/11-1.webp",
          "/images/Gongzheng A3 HD Desktop UV Printer/11-2.webp",
          "/images/Gongzheng A3 HD Desktop UV Printer/11-3.webp",
          "/images/Gongzheng A3 HD Desktop UV Printer/11-4.webp",
          "/images/Gongzheng A3 HD Desktop UV Printer/11-5.webp",
        ],
        specs: [
          ["Usage / Application", "Acrylic, Aluminum Sheet, Foam Board, PVC Board, Leather, Glass Bottle, Wood, Ceramic Tile, etc"],
          ["Printing Width", "420 mm"],
          ["Ink Type", "Specific REI-3 UV Ink (Greenguard Gold Certified)"],
          ["Brand", "Gongzheng"],
          ["Print Head", "1 × Epson I3200(8)-U1HD"],
          ["Weight", "212 kgs"],
          ["Power Consumption", "Single-Phase, AC220V±10%, 50Hz, 10A"],
          ["Model", "A3HD"],
          ["Curing System", "1 Air Cooling LED UV Lamp"],
          ["Color Configuration", "CMYKLcLm + W + V"],
          ["Media Thickness", "Up to 60 mm"],
          ["Printing Speed", "720×1800 dpi"],
          ["Data Interface", "Gigabit Ethernet"],
        ],
        highlights: [
          "Epson I3200(8)-U1HD printhead",
          "Compact, unique body design",
          "Auto height detection up to 60 mm",
          "Constant printhead heater",
          "Powerful suction platform",
          "Touch screen panel",
        ],
      },
    ],
  },
  {
    id: "cat-inkjet-printers",
    slug: "inkjet-printers",
    routePath: "/inkjet-printer",
    name: "Inkjet Printers",
    intro:
      "Leading Wholesaler of Allwin E520-8H 5M Giant Inkjet Printer and Allwin C8 Pro Inkjet Printer from Ahmedabad.",
    products: [
      {
        id: "allwin-e520-8h",
        categorySlug: "inkjet-printers",
        slug: "allwin-e520-8h-5m-giant-inkjet-printer",
        name: "Allwin E520-8H 5M Giant Inkjet Printer",
        priceDisplay: "₹ 26,00,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+E520-8H+5M+Giant+Inkjet+Printer+-+PDF+Catalogue.pdf",
        images: ["/images/Inkjet Printer/12-1.webp", "/images/Inkjet Printer/12-2.webp"],
        specs: [
          ["Max Printing Width", "5285 mm"],
          ["Brand", "Allwin"],
          ["Model Name/Number", "E520-8H"],
          ["Print Speed", "280 m²/h"],
          ["Printing Resolution", "360 dpi"],
          ["Weight", "2350 kg"],
          ["Number Of Print Heads", "8"],
          ["Power", "13595 W"],
          ["Size", "7800(L) × 1200(W) × 1650(H) mm"],
          ["Rated Frequency", "50 Hz"],
          ["Voltage", "220 V"],
        ],
        highlights: [
          "5m-class wide output for high-volume production",
          "8 print heads for faster throughput",
          "360 dpi production resolution",
          "Industrial build and stable chassis",
        ],
      },
      {
        id: "allwin-c8-pro",
        categorySlug: "inkjet-printers",
        slug: "allwin-c8-pro-inkjet-printer",
        name: "Allwin C8 Pro Inkjet Printer",
        priceDisplay: "₹ 11,00,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/Allwin+C8+Pro+Inkjet+Printer+-+PDF+Catalogue.pdf",
        images: ["/images/Inkjet Printer/13-1.webp", "/images/Inkjet Printer/13-2.webp"],
        specs: [
          ["Brand", "Allwin"],
          ["Model", "C8 Pro"],
          ["Print Width", "3300 mm"],
          ["Printhead Quantity", "8"],
          ["Printing Speed", "280 m²/h"],
          ["Printing Resolution", "360 dpi"],
          ["Machine Max Power", "9095 W"],
          ["Gross Weight", "975 kg"],
          ["Machine Size", "4450(L) × 940(W) × 1300(H) mm"],
          ["Rated Frequency", "50 Hz"],
          ["Voltage", "220 V"],
        ],
        highlights: [
          "3.3m printing width for signage work",
          "8-head configuration for speed",
          "Efficient power footprint vs 5m class",
          "Compact industrial form factor",
        ],
      },
    ],
  },
  {
    id: "cat-uv-flatbed-printer",
    slug: "uv-flatbed-printer",
    routePath: "/flatbed-uv-printer",
    name: "UV Flatbed Printer",
    intro: "Pioneers in the industry, we offer Allwin Ricoh 2513 UV Flatbed Printer from India.",
    products: [
      {
        id: "allwin-ricoh-2513",
        categorySlug: "uv-flatbed-printer",
        slug: "allwin-ricoh-2513-uv-flatbed-printer",
        name: "Allwin Ricoh 2513 UV Flatbed Printer",
        priceDisplay: "₹ 21,00,000 / Piece",
        brochureUrl:
          "https://elkatech-brochure.s3.us-east-1.amazonaws.com/1200+dpi+4+Allwin+Ricoh+2513+UV+Flatbed+Printer%2C+60+m2_h+-+PDF+Catalogue.pdf",
        images: ["/images/Flatbed.png"],
        specs: [
          ["Printing Width", "2500 mm"],
          ["Print Resolution", "1200 dpi"],
          ["Print Speed", "60 m²/h"],
          ["Printheads", "4"],
          ["Printhead Cleaning System", "Automatic"],
          ["Media Thickness", "100 mm"],
          ["Voltage", "220 V"],
          ["Power", "3600 W"],
        ],
        highlights: [
          "2.5m flatbed format for rigid boards",
          "1200 dpi resolution for sharp output",
          "Up to 60 m²/h production speed",
          "Automatic printhead cleaning system",
          "Supports media thickness up to 100 mm",
        ],
      },
    ],
  },
] satisfies CatalogCategory[];

export const domainEventTypeSchema = z.enum([
  "user.registered",
  "user.email_verified",
  "user.password_reset_requested",
  "request.created",
  "request.assigned",
  "request.status_changed",
  "request.customer_message_posted",
  "request.staff_reply_posted",
]);
export type DomainEventType = z.infer<typeof domainEventTypeSchema>;

export const domainEventSchema = z.object({
  id: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  eventType: domainEventTypeSchema,
  payload: z.record(z.any()),
  occurredAt: z.string(),
});
export type DomainEvent = z.infer<typeof domainEventSchema>;

// ─── Activity console (person-centric operations views) ─────────────────────
// Read-only projections over data that already exists: service_desk.requests,
// service_desk.request_history and auth.users/sessions. There is NO dedicated
// audit table, so account actions (role changes, invites, approvals,
// suspensions) are deliberately absent — no actor+timestamp record exists for
// them and deriving one from current state would be fabrication.

/** Active work is flagged "stale" after this long with no update. There is no
 *  SLA field in the schema, so this is an activity heuristic — never presented
 *  as a contractual "overdue". */
export const ACTIVITY_STALE_AFTER_DAYS = 7;
/** A person counts as "recently active" within this window. */
export const ACTIVITY_RECENT_DAYS = 7;

export const ACTIVITY_PAGE_SIZE_DEFAULT = 25;
export const ACTIVITY_PAGE_SIZE_MAX = 100;

/**
 * Human-meaningful summary of what a person is doing right now. The API emits
 * the discriminator plus the counts; the UI renders the wording, so copy can
 * change without an API change.
 */
export const activityPersonStateSchema = z.enum([
  "suspended",
  "pending_approval",
  "rejected",
  "working",
  "waiting_on_customer",
  "assignments_pending",
  "open_requests",
  "no_active_work",
]);
export type ActivityPersonState = z.infer<typeof activityPersonStateSchema>;

const activityRelCountsSchema = z.object({
  total: z.number().int(),
  /** status = in_progress — actively being worked. */
  inProgress: z.number().int(),
  /** status = assigned — accepted but not started. */
  pending: z.number().int(),
  waiting: z.number().int(),
  open: z.number().int(),
  completed: z.number().int(),
  unassigned: z.number().int(),
  /** Active items untouched for ACTIVITY_STALE_AFTER_DAYS. Not an SLA breach. */
  stale: z.number().int(),
});
export type ActivityRelCounts = z.infer<typeof activityRelCountsSchema>;

export const activityWorkloadSchema = z.object({
  /** Requests assigned to them (requests.assigned_engineer_id). */
  asEngineer: activityRelCountsSchema,
  /** Requests they own (requests.customer_id). */
  asCustomer: activityRelCountsSchema,
  /** Requests they filed, incl. staff filing on a customer's behalf — derived
   *  from request_created history rows, so it attributes the real author. */
  asCreator: activityRelCountsSchema,
  /** Total rows in request_history authored by them. */
  recordedEvents: z.number().int(),
});
export type ActivityWorkload = z.infer<typeof activityWorkloadSchema>;

export const activityPersonRowSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  /** Current account role. Never conflate with a history row's recordedRole. */
  role: roleSchema,
  /** Protected Admin identities do not participate in the approval lifecycle. */
  approvalStatus: approvalStatusSchema.nullable(),
  accountOrigin: accountOriginSchema,
  companyName: z.string().nullable(),
  profileCompleted: z.boolean(),
  createdAt: z.string(),
  /** From auth.sessions.last_seen_at; null when no live session row remains. */
  lastSeenAt: z.string().nullable(),
  lastRecordedActivityAt: z.string().nullable(),
  state: activityPersonStateSchema,
  /** Count that belongs with `state` — e.g. 3 for "Working on 3 requests".
   *  Always paired with the state so a bare number is never rendered. */
  stateCount: z.number().int(),
  /** Role-resolved headline figures for the directory table. */
  open: z.number().int(),
  completed: z.number().int(),
  machineCount: z.number().int(),
  workload: activityWorkloadSchema,
});
export type ActivityPersonRow = z.infer<typeof activityPersonRowSchema>;

export const activityDirectorySummarySchema = z.object({
  totalPeople: z.number().int(),
  activeEngineers: z.number().int(),
  activeSupport: z.number().int(),
  withOpenWork: z.number().int(),
  recentlyActive: z.number().int(),
  inactiveAccounts: z.number().int(),
});

export const activityPeopleResponseSchema = z.object({
  people: z.array(activityPersonRowSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  summary: activityDirectorySummarySchema,
});
export type ActivityPeopleResponse = z.infer<typeof activityPeopleResponseSchema>;

export const activityPeopleQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  role: roleSchema.optional(),
  status: approvalStatusSchema.optional(),
  filter: z.enum(["active_work", "has_open", "recently_active"]).optional(),
  limit: z.coerce.number().int().min(1).max(ACTIVITY_PAGE_SIZE_MAX).default(ACTIVITY_PAGE_SIZE_DEFAULT),
  offset: z.coerce.number().int().min(0).default(0),
});
export type ActivityPeopleQuery = z.infer<typeof activityPeopleQuerySchema>;

/** Event types the console knows how to phrase. Unknown values still render
 *  (humanised generically) rather than being dropped. */
export const activityEventTypeSchema = z.enum([
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
]);
export type ActivityEventType = z.infer<typeof activityEventTypeSchema>;

/**
 * Whitelisted history metadata. `request_history.metadata` is free-form jsonb,
 * so it is never returned raw. Message bodies, cancellation reasons,
 * attachment URLs and machine serials are all excluded by construction.
 */
export const activityEventDetailsSchema = z.object({
  from: requestStatusSchema.nullable(),
  to: requestStatusSchema.nullable(),
  engineerId: z.string().nullable(),
  engineerName: z.string().nullable(),
  previousEngineerId: z.string().nullable(),
  previousEngineerName: z.string().nullable(),
  visibility: messageVisibilitySchema.nullable(),
  fields: z.array(z.string()).nullable(),
  issueType: z.string().nullable(),
  attachmentKind: attachmentKindSchema.nullable(),
});

export const activityEventSchema = z.object({
  id: z.string(),
  occurredAt: z.string(),
  eventType: z.string(),
  /** The role captured when the action happened — NOT the actor's role today. */
  recordedRole: roleSchema,
  actorId: z.string(),
  request: z
    .object({
      id: z.string(),
      requestNumber: z.string(),
      subject: z.string(),
      status: requestStatusSchema,
      customerId: z.string(),
    })
    .nullable(),
  details: activityEventDetailsSchema,
});
export type ActivityEvent = z.infer<typeof activityEventSchema>;

export const activityEventPageSchema = z.object({
  events: z.array(activityEventSchema),
  nextCursor: z.string().nullable(),
});
export type ActivityEventPage = z.infer<typeof activityEventPageSchema>;

export const activityTaskBucketSchema = z.enum(["active", "waiting", "completed", "all"]);
export type ActivityTaskBucket = z.infer<typeof activityTaskBucketSchema>;

export const activityTaskSchema = z.object({
  id: z.string(),
  requestNumber: z.string(),
  subject: z.string(),
  issueType: z.string().nullable(),
  status: requestStatusSchema,
  priority: requestPrioritySchema,
  customerId: z.string(),
  customerName: z.string().nullable(),
  machineId: z.string().nullable(),
  machineLabel: z.string().nullable(),
  assignedEngineerId: z.string().nullable(),
  /** Null when the engineer account was removed — UI renders "Removed user". */
  assignedEngineerName: z.string().nullable(),
  /** From the matching assign/claim history row; null when never recorded. */
  assignedAt: z.string().nullable(),
  createdAt: z.string(),
  lastActivityAt: z.string(),
  ageDays: z.number().int(),
  /** Active work untouched for ACTIVITY_STALE_AFTER_DAYS. Not an SLA breach. */
  stale: z.boolean(),
});
export type ActivityTask = z.infer<typeof activityTaskSchema>;

export const activityTaskPageSchema = z.object({
  tasks: z.array(activityTaskSchema),
  nextCursor: z.string().nullable(),
});
export type ActivityTaskPage = z.infer<typeof activityTaskPageSchema>;

/**
 * Customer-safe machine view for the activity console. Deliberately excludes
 * `internalSerialNumber` and admin notes — this surface is reachable by
 * support, who must never see internal serials.
 */
export const activityMachineSchema = z.object({
  id: z.string(),
  displayLabel: z.string(),
  productName: z.string(),
  unitNumber: z.string().nullable(),
  siteName: z.string().nullable(),
  siteLocation: z.string(),
  status: customerMachineStatusSchema,
});
export type ActivityMachine = z.infer<typeof activityMachineSchema>;

export const activityPersonDetailSchema = z.object({
  person: activityPersonRowSchema,
  machineCount: z.number().int(),
  /** Priority spread of the person's *active* work. Empty for roles with none. */
  priorityDistribution: z.record(requestPrioritySchema, z.number().int()),
  /** Counts per recorded event type — drives the Support/Owner section tabs. */
  eventCounts: z.record(z.string(), z.number().int()),
});
export type ActivityPersonDetail = z.infer<typeof activityPersonDetailSchema>;

/* ═══ Issue reports ═══════════════════════════════════════════════════════
 *
 * Customer-submitted problem reports, tracked by staff through a three-step
 * workflow. The defining constraint of this contract: NO staff-facing schema
 * below carries the reporting customer's identity. There is no `reporterUserId`
 * field, no email, no display name — a report is addressed only by its
 * `reporterReference` (RPT-USR-8F3A2C), and re-identification is a separate,
 * admin-only, audited call. Adding an identity field to `issueReportRowSchema`
 * or `issueReportDetailSchema` would silently defeat the whole feature; the
 * projection tests exist to catch exactly that.
 */

export const REPORT_TITLE_MAX = 200;
export const REPORT_DESCRIPTION_MAX = 5000;
export const REPORT_ERROR_MAX = 8000;
export const REPORT_STEPS_MAX = 4000;
export const REPORT_RESOLUTION_MAX = 4000;
export const REPORT_NOTE_MAX = 4000;

export const REPORTS_PAGE_SIZE_DEFAULT = 25;
export const REPORTS_PAGE_SIZE_MAX = 100;

/** How many reports one account may file per rolling 24h. Server-enforced in
 *  addition to the gateway rate limit, which a determined client could evade
 *  by spacing requests out. */
export const REPORT_DAILY_LIMIT = 20;

export const reportStatusSchema = z.enum(["new", "working", "resolved"]);
export type ReportStatus = z.infer<typeof reportStatusSchema>;

export const reportSeveritySchema = z.enum(["low", "medium", "high", "blocking"]);
export type ReportSeverity = z.infer<typeof reportSeveritySchema>;

export const reportAreaSchema = z.enum([
  "login",
  "account",
  "service_requests",
  "attachments",
  "machines",
  "dashboard",
  "notifications",
  "other",
]);
export type ReportArea = z.infer<typeof reportAreaSchema>;

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  new: "New",
  working: "Working",
  resolved: "Resolved",
};

export const REPORT_SEVERITY_LABELS: Record<ReportSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  blocking: "Blocking",
};

export const REPORT_SEVERITY_DESCRIPTIONS: Record<ReportSeverity, string> = {
  low: "Minor annoyance. There is a workaround and work continues.",
  medium: "Something is broken but the task can still be finished another way.",
  high: "A core task cannot be completed. No reasonable workaround.",
  blocking: "Work has stopped entirely and nothing can proceed.",
};

export const REPORT_AREA_LABELS: Record<ReportArea, string> = {
  login: "Login",
  account: "Account",
  service_requests: "Service requests",
  attachments: "Attachments",
  machines: "Machines",
  dashboard: "Dashboard",
  notifications: "Notifications",
  other: "Other",
};

/**
 * Safe technical context. Every field is either a controlled value or a
 * scrubbed one — there is deliberately no `userAgent`, no `url`, and no
 * `query`. `route` is the path with its query string dropped and identifier
 * segments collapsed, and browser/OS are coarse families rather than versions.
 */
export const reportBrowserSchema = z.enum([
  "chrome",
  "safari",
  "firefox",
  "edge",
  "other",
]);
export type ReportBrowser = z.infer<typeof reportBrowserSchema>;

export const reportOsSchema = z.enum([
  "macos",
  "windows",
  "linux",
  "ios",
  "android",
  "other",
]);
export type ReportOs = z.infer<typeof reportOsSchema>;

export const REPORT_BROWSER_LABELS: Record<ReportBrowser, string> = {
  chrome: "Chrome",
  safari: "Safari",
  firefox: "Firefox",
  edge: "Edge",
  other: "Other",
};

export const REPORT_OS_LABELS: Record<ReportOs, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  ios: "iOS",
  android: "Android",
  other: "Other",
};

export const reportTechnicalContextSchema = z.object({
  /** Scrubbed path only — never a full URL, never a query string. */
  route: z.string().max(200).nullable(),
  browser: reportBrowserSchema.nullable(),
  operatingSystem: reportOsSchema.nullable(),
  appVersion: z.string().max(80).nullable(),
  correlationId: z.string().max(120).nullable(),
  relatedRequestId: z.string().uuid().nullable(),
  relatedMachineId: z.string().uuid().nullable(),
});
export type ReportTechnicalContext = z.infer<typeof reportTechnicalContextSchema>;

export const createIssueReportInputSchema = z.object({
  title: z.string().trim().min(4).max(REPORT_TITLE_MAX),
  description: z.string().trim().min(10).max(REPORT_DESCRIPTION_MAX),
  exactError: z.string().trim().max(REPORT_ERROR_MAX).optional(),
  stepsToReproduce: z.string().trim().max(REPORT_STEPS_MAX).optional(),
  applicationArea: reportAreaSchema,
  severity: reportSeveritySchema,
  // Client-supplied context is advisory: the server re-validates every field
  // against these schemas and drops anything that does not match, so a crafted
  // client cannot smuggle a raw UA string or a full URL into storage.
  context: reportTechnicalContextSchema.partial().optional(),
});
export type CreateIssueReportInput = z.infer<typeof createIssueReportInputSchema>;

export const updateReportStatusInputSchema = z.object({
  status: reportStatusSchema,
});

export const assignReportInputSchema = z.object({
  /** null clears the assignment. */
  assigneeId: z.string().uuid().nullable(),
});

export const createReportNoteInputSchema = z.object({
  body: z.string().trim().min(1).max(REPORT_NOTE_MAX),
  visibility: messageVisibilitySchema,
});

export const recordReportResolutionInputSchema = z.object({
  resolution: z.string().trim().min(1).max(REPORT_RESOLUTION_MAX),
});

export const linkReportRequestInputSchema = z.object({
  /** null unlinks. */
  requestId: z.string().uuid().nullable(),
});

export const reporterLookupInputSchema = z.object({
  reporterReference: z.string().trim().min(1).max(40),
});

/** One row in the staff Issue Reports table. Identity-free by construction. */
export const issueReportRowSchema = z.object({
  id: z.string(),
  reportNumber: z.string(),
  title: z.string(),
  applicationArea: reportAreaSchema,
  severity: reportSeveritySchema,
  status: reportStatusSchema,
  /** The only handle on the reporter that staff ever receive. */
  reporterReference: z.string(),
  assignedUserId: z.string().nullable(),
  /** Staff display name — employees are not anonymised from each other, but
   *  nothing beyond a name and role is ever included. */
  assignedUserName: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type IssueReportRow = z.infer<typeof issueReportRowSchema>;

export const issueReportSummarySchema = z.object({
  new: z.number().int(),
  working: z.number().int(),
  resolved: z.number().int(),
  blocking: z.number().int(),
});
export type IssueReportSummary = z.infer<typeof issueReportSummarySchema>;

export const issueReportListResponseSchema = z.object({
  reports: z.array(issueReportRowSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
  summary: issueReportSummarySchema,
});
export type IssueReportListResponse = z.infer<typeof issueReportListResponseSchema>;

export const issueReportNoteSchema = z.object({
  id: z.string(),
  visibility: messageVisibilitySchema,
  body: z.string(),
  authorName: z.string().nullable(),
  authorRole: roleSchema,
  createdAt: z.string(),
});
export type IssueReportNote = z.infer<typeof issueReportNoteSchema>;

export const issueReportEventSchema = z.object({
  id: z.string(),
  eventType: z.string(),
  /** Role recorded at the time of the action, not the actor's role today. */
  actorRole: roleSchema,
  /** Safe staff label ("Support"/"Admin" + name). Null for system entries. */
  actorLabel: z.string().nullable(),
  previousValue: z.string().nullable(),
  newValue: z.string().nullable(),
  createdAt: z.string(),
});
export type IssueReportEvent = z.infer<typeof issueReportEventSchema>;

export const issueReportAttachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  contentType: z.string(),
  sizeBytes: z.number(),
  /** Always a short-lived signed URL — report evidence never gets a permanent
   *  public URL, even when the bucket has a public base configured. */
  url: z.string(),
  createdAt: z.string(),
});
export type IssueReportAttachment = z.infer<typeof issueReportAttachmentSchema>;

/** Full staff view. Still identity-free: `reporterReference` only. */
export const issueReportDetailSchema = z.object({
  id: z.string(),
  reportNumber: z.string(),
  title: z.string(),
  description: z.string(),
  exactError: z.string().nullable(),
  stepsToReproduce: z.string().nullable(),
  applicationArea: reportAreaSchema,
  severity: reportSeveritySchema,
  status: reportStatusSchema,
  reporterReference: z.string(),
  assignedUserId: z.string().nullable(),
  assignedUserName: z.string().nullable(),
  relatedRequestId: z.string().nullable(),
  relatedRequestNumber: z.string().nullable(),
  relatedMachineId: z.string().nullable(),
  resolution: z.string().nullable(),
  context: reportTechnicalContextSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
  notes: z.array(issueReportNoteSchema),
  history: z.array(issueReportEventSchema),
  attachments: z.array(issueReportAttachmentSchema),
  /** Statuses this actor may move the report to right now. */
  allowedTransitions: z.array(reportStatusSchema),
});
export type IssueReportDetail = z.infer<typeof issueReportDetailSchema>;

/**
 * What the reporting customer sees. Separate schema rather than a filtered
 * detail: internal notes, the reporter reference, assignment and technical
 * metadata have no field to live in, so they cannot leak through a missed
 * `delete` on the server.
 */
export const myIssueReportRowSchema = z.object({
  id: z.string(),
  reportNumber: z.string(),
  title: z.string(),
  applicationArea: reportAreaSchema,
  severity: reportSeveritySchema,
  status: reportStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MyIssueReportRow = z.infer<typeof myIssueReportRowSchema>;

export const myIssueReportDetailSchema = z.object({
  id: z.string(),
  reportNumber: z.string(),
  title: z.string(),
  description: z.string(),
  exactError: z.string().nullable(),
  stepsToReproduce: z.string().nullable(),
  applicationArea: reportAreaSchema,
  severity: reportSeveritySchema,
  status: reportStatusSchema,
  /** Public resolution text only — never an internal note. */
  resolution: z.string().nullable(),
  /** Staff replies explicitly marked customer_visible. */
  responses: z.array(
    z.object({
      id: z.string(),
      body: z.string(),
      createdAt: z.string(),
    }),
  ),
  attachments: z.array(issueReportAttachmentSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
  resolvedAt: z.string().nullable(),
});
export type MyIssueReportDetail = z.infer<typeof myIssueReportDetailSchema>;

export const issueReportListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: reportStatusSchema.optional(),
  severity: reportSeveritySchema.optional(),
  area: reportAreaSchema.optional(),
  assignee: z.string().optional(),
  /** Inclusive ISO date bounds on created_at (YYYY-MM-DD). */
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(REPORTS_PAGE_SIZE_MAX)
    .default(REPORTS_PAGE_SIZE_DEFAULT),
  offset: z.coerce.number().int().min(0).default(0),
});
export type IssueReportListQuery = z.infer<typeof issueReportListQuerySchema>;
