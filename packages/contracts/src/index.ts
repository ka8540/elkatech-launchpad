import { z } from "zod";

export const roleSchema = z.enum(["customer", "engineer", "admin"]);
export type Role = z.infer<typeof roleSchema>;

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
  role: z.enum(["customer", "engineer", "admin"]),
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
  siteLocation: z.string().trim().min(2).max(200),
  contactPhone: z.string().trim().max(30).optional(),
  purchaseDate: z.string().trim().max(20).optional(),
  installDate: z.string().trim().max(20).optional(),
  notes: z.string().trim().max(2000).optional(),
});
export type CreateCustomerMachineInput = z.infer<typeof createCustomerMachineInputSchema>;

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
});
export type CreateCustomerRequestInput = z.infer<typeof createCustomerRequestInputSchema>;

// ─── Request attachments (photo/video evidence stored in Cloudflare R2) ─────
export const attachmentKindSchema = z.enum(["image", "video"]);
export type AttachmentKind = z.infer<typeof attachmentKindSchema>;

export const requestAttachmentSchema = z.object({
  id: z.string(),
  requestId: z.string(),
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
