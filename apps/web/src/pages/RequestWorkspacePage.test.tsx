import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AuthUser, Role } from "@elkatech/contracts";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const apiRequest = vi.hoisted(() => vi.fn());
const uploadRequestAttachment = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);
const session = vi.hoisted(() => ({
  user: {
    id: "admin-1",
    email: "admin@elkatech.local",
    displayName: "Kush Admin",
    role: "admin" as Role,
    emailVerified: true,
    approvalStatus: "approved" as const,
    accountOrigin: "admin_invite" as const,
    profileCompleted: true,
    createdAt: "2026-04-05T12:00:00.000Z",
  } satisfies AuthUser,
}));

class MockApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

vi.mock("@/lib/api", () => ({ apiRequest, ApiError: MockApiError }));
vi.mock("@/hooks/use-session", () => ({
  useSession: () => ({ data: session, isLoading: false }),
}));
vi.mock("@/lib/attachments", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/attachments")>();
  return {
    ...original,
    uploadRequestAttachment,
  };
});
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

const { default: RequestWorkspacePage } = await import("./RequestWorkspacePage");

const request = {
  id: "req-1",
  requestNumber: "SRV-03445846-300",
  customerId: "customer-1",
  productId: "product-1",
  productSnapshot: {
    id: "product-1",
    categorySlug: "lamination-machines",
    slug: "molor-ml1600k",
    name: "Molor ML1600K Cold Heat Lamination Machine",
    priceDisplay: "$1",
  },
  customerMachineId: "machine-1",
  issueType: "ink_issue",
  subject: "Ink issue — molor ml",
  description: "Ink pressure drops after ten minutes of production.",
  contactPhone: "+18980387432",
  siteLocation: "Ahmedabad, Gujarat",
  serialNumber: "INTERNAL-123456789",
  priority: "urgent" as const,
  status: "resolved" as const,
  assignedEngineerId: "engineer-1",
  createdAt: "2026-06-11T18:44:00.000Z",
  updatedAt: "2026-06-11T18:46:00.000Z",
};

const messages = [
  {
    id: "message-customer",
    requestId: "req-1",
    authorId: "customer-1",
    authorRole: "customer" as const,
    authorDisplayName: "Kush Customer",
    authorEmail: "customer@example.com",
    visibility: "customer_visible" as const,
    body: "The ink pressure drops\nright after warm-up.",
    createdAt: "2026-06-11T18:44:30.000Z",
  },
  {
    id: "message-staff",
    requestId: "req-1",
    authorId: "engineer-1",
    authorRole: "engineer" as const,
    authorDisplayName: "Alex Engineer",
    authorEmail: "alex@example.com",
    visibility: "customer_visible" as const,
    body: "I checked the feed line.",
    createdAt: "2026-06-11T18:45:00.000Z",
  },
  {
    id: "message-internal",
    requestId: "req-1",
    authorId: "admin-1",
    authorRole: "admin" as const,
    authorDisplayName: "Kush Admin",
    authorEmail: "admin@elkatech.local",
    visibility: "internal_note" as const,
    body: "Replacement pump is covered by warranty.",
    createdAt: "2026-06-11T18:45:30.000Z",
  },
];

const attachment = {
  id: "attachment-1",
  requestId: "req-1",
  uploadedBy: "customer-1",
  fileName: "694f452c-cc4f-493e-aad5-40fa2b2cf111.jpg",
  contentType: "image/jpeg",
  sizeBytes: 1_024,
  kind: "image" as const,
  url: "https://example.com/evidence.jpg",
  createdAt: "2026-06-11T18:44:40.000Z",
};

function detail(overrides: Record<string, unknown> = {}) {
  return {
    request,
    assignedEngineer: {
      id: "engineer-1",
      displayName: "Alex Engineer",
      email: "alex@example.com",
      role: "engineer",
    },
    messages,
    history: [
      {
        id: "history-1",
        requestId: "req-1",
        actorId: "engineer-1",
        actorRole: "engineer",
        eventType: "status_changed",
        metadata: { from: "in_progress", to: "resolved" },
        createdAt: "2026-06-11T18:46:00.000Z",
      },
    ],
    attachments: [attachment],
    machine: {
      id: "machine-1",
      displayLabel: "molor ml",
      productName: request.productSnapshot.name,
      internalSerialNumber: request.serialNumber,
    },
    customer: {
      displayName: "Kush Customer",
      companyName: "ABCD",
    },
    ...overrides,
  };
}

function setRole(role: Role) {
  session.user = {
    ...session.user,
    id: role === "customer" ? "customer-1" : role === "engineer" ? "engineer-1" : "admin-1",
    role,
  };
}

function routeApi(payload = detail()) {
  apiRequest.mockImplementation((url: string, options?: { method?: string }) => {
    if (url.startsWith("/api/requests/req-1?") && !options?.method) {
      return Promise.resolve(payload);
    }
    if (
      url === "/api/requests/req-1/messages" &&
      options?.method === "POST"
    ) {
      return Promise.resolve({
        ...messages[2],
        id: "sent-message",
        visibility: "customer_visible",
      });
    }
    if (url === "/api/engineers") {
      return Promise.resolve([
        {
          id: "engineer-1",
          displayName: "Alex Engineer",
          email: "alex@example.com",
        },
        {
          id: "engineer-2",
          displayName: "Priya Engineer",
          email: "priya@example.com",
        },
      ]);
    }
    return Promise.resolve({});
  });
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/app/requests/req-1"]}>
        <Routes>
          <Route
            path="/app/requests/:requestId"
            element={<RequestWorkspacePage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiRequest.mockReset();
  uploadRequestAttachment.mockClear();
  setRole("admin");
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
    configurable: true,
    value: vi.fn(() => false),
  });
  Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("request workspace structure", () => {
  it("renders a compact summary, required metadata, and responsive workspace", async () => {
    routeApi();
    renderPage();

    expect(
      await screen.findByRole("heading", { name: "Ink issue — molor ml" }),
    ).toBeInTheDocument();
    const header = screen.getByTestId("request-workspace-header");
    expect(header).toHaveTextContent("SRV-03445846-300");
    expect(header).toHaveTextContent("Alex Engineer");
    expect(header).toHaveTextContent("molor ml");
    expect(header).toHaveTextContent("Created");
    expect(header).toHaveTextContent("Updated");

    expect(screen.getByTestId("request-workspace-layout")).toHaveClass(
      "items-start",
      "xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.44fr)]",
    );
    expect(screen.getByRole("region", { name: "Conversation" })).toHaveClass(
      "self-start",
      "xl:h-[720px]",
      "xl:max-h-[calc(100vh-8rem)]",
    );
    expect(screen.getByTestId("request-context-panel")).toHaveClass(
      "xl:sticky",
    );
    expect(screen.getByTestId("request-context-panel")).not.toHaveClass(
      "xl:h-[calc(100vh-8rem)]",
    );
  });

  it("keeps the composer immediately available in a compact empty state", async () => {
    routeApi(detail({ messages: [] }));
    renderPage();

    expect(await screen.findByText("No updates yet")).toBeInTheDocument();
    const composer = screen.getByLabelText("Message");
    expect(composer).toHaveAttribute("rows", "1");
    expect(composer).toHaveClass("resize-none", "min-h-[42px]");
    expect(
      screen.getByRole("button", { name: "Send update" }),
    ).toBeDisabled();
  });

  it("grows the message composer with its content and caps long drafts", async () => {
    routeApi(detail({ messages: [] }));
    renderPage();

    const composer = await screen.findByTestId("auto-growing-composer");
    Object.defineProperty(composer, "scrollHeight", {
      configurable: true,
      value: 112,
    });
    fireEvent.change(composer, {
      target: { value: "A longer update\nwith several lines\nfor the customer." },
    });
    await waitFor(() => expect(composer).toHaveStyle({ height: "112px" }));

    Object.defineProperty(composer, "scrollHeight", {
      configurable: true,
      value: 240,
    });
    fireEvent.change(composer, {
      target: { value: "A very long draft that should stop growing." },
    });
    await waitFor(() =>
      expect(composer).toHaveStyle({
        height: "160px",
        overflowY: "auto",
      }),
    );
  });

  it("sends with Enter and keeps Shift+Enter available for a new line", async () => {
    routeApi(detail({ messages: [] }));
    renderPage();

    const composer = await screen.findByLabelText("Message");
    fireEvent.change(composer, { target: { value: "Send this update" } });

    fireEvent.keyDown(composer, {
      key: "Enter",
      code: "Enter",
      shiftKey: true,
    });
    expect(
      apiRequest.mock.calls.some(
        ([url, options]) =>
          String(url).endsWith("/messages") && options?.method === "POST",
      ),
    ).toBe(false);

    fireEvent.keyDown(composer, {
      key: "Enter",
      code: "Enter",
    });

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith(
        "/api/requests/req-1/messages",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            body: "Send this update",
            visibility: "customer_visible",
          }),
        }),
      ),
    );
  });
});

describe("conversation safety and states", () => {
  it("visually distinguishes customer and staff messages, and omits internal notes", async () => {
    routeApi();
    renderPage();

    expect((await screen.findAllByText("Kush Customer")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alex Engineer").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Replacement pump is covered by warranty."),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Internal only")).not.toBeInTheDocument();
    expect(
      screen
        .getByText(/The ink pressure drops/)
        .closest("[data-message-side]"),
    ).toHaveAttribute("data-message-side", "left");
    expect(
      screen
        .getByText("I checked the feed line.")
        .closest("[data-message-side]"),
    ).toHaveAttribute("data-message-side", "left");
    expect(screen.getByText(/The ink pressure drops/)).toHaveClass(
      "whitespace-pre-wrap",
    );
    expect(screen.getByRole("log")).not.toHaveClass("mt-auto");
    expect(screen.getByRole("log")).toHaveClass(
      "max-h-[clamp(360px,64vh,760px)]",
    );
    expect(screen.queryByLabelText("Message visibility")).toBeNull();
  });

  it("keeps untrusted message content as text rather than unsafe HTML", async () => {
    routeApi(
      detail({
        messages: [
          {
            ...messages[0],
            body: "<img src=x onerror=alert('unsafe')>",
          },
        ],
      }),
    );
    renderPage();

    expect(
      await screen.findByText("<img src=x onerror=alert('unsafe')>"),
    ).toBeInTheDocument();
    expect(document.querySelector("img[src='x']")).toBeNull();
  });

  it("shows sending and failed-send states while preserving the draft", async () => {
    let rejectMessage: ((error: Error) => void) | undefined;
    routeApi();
    apiRequest.mockImplementation((url: string, options?: { method?: string }) => {
      if (url.startsWith("/api/requests/req-1?") && !options?.method) {
        return Promise.resolve(detail({ messages: [] }));
      }
      if (url.endsWith("/messages")) {
        return new Promise((_, reject) => {
          rejectMessage = reject;
        });
      }
      if (url === "/api/engineers") return Promise.resolve([]);
      return Promise.resolve({});
    });
    renderPage();

    const textarea = await screen.findByLabelText("Message");
    fireEvent.change(textarea, { target: { value: "Keep this draft" } });
    fireEvent.click(screen.getByRole("button", { name: "Send update" }));
    expect(
      await screen.findByRole("button", { name: "Sending…" }),
    ).toBeDisabled();

    rejectMessage?.(new Error("Network unavailable"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network unavailable",
    );
    expect(textarea).toHaveValue("Keep this draft");
  });

  it("shows selected file thumbnails and opens their preview", async () => {
    routeApi(detail({ messages: [] }));
    const { container } = renderPage();

    const file = new File(["preview"], "machine-photo.png", {
      type: "image/png",
    });
    await screen.findByRole("button", { name: "Attach files" });
    const input = container.querySelector<HTMLInputElement>(
      'input[type="file"][accept="image/*,video/*"]',
    );
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [file] } });

    const selectedPreview = await screen.findByRole("button", {
      name: "Preview selected machine-photo.png",
    });
    expect(selectedPreview.querySelector("img")).toHaveAttribute(
      "src",
      "blob:preview",
    );

    fireEvent.click(selectedPreview);
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      "machine-photo.png",
    );
    expect(screen.getByRole("dialog")).toHaveTextContent("image/png");
  });

  it("offers no internal-note switch and keeps attachments available", async () => {
    routeApi(detail({ messages: [] }));
    const { container } = renderPage();

    await screen.findByRole("button", { name: "Attach files" });
    expect(screen.queryByLabelText("Message visibility")).toBeNull();
    expect(screen.queryByText("Internal note")).toBeNull();
    expect(
      screen.getByPlaceholderText("Message the customer…"),
    ).toBeInTheDocument();

    const file = new File(["preview"], "private-photo.png", {
      type: "image/png",
    });
    const input = container.querySelector<HTMLInputElement>(
      'input[type="file"][accept="image/*,video/*"]',
    );
    fireEvent.change(input!, { target: { files: [file] } });
    expect(
      await screen.findByRole("button", {
        name: "Preview selected private-photo.png",
      }),
    ).toBeInTheDocument();
  });

  it("uploads customer-visible files against the sent conversation message", async () => {
    routeApi(detail({ messages: [] }));
    const { container } = renderPage();

    const file = new File(["preview"], "evidence.png", {
      type: "image/png",
    });
    await screen.findByRole("button", { name: "Attach files" });
    const input = container.querySelector<HTMLInputElement>(
      'input[type="file"][accept="image/*,video/*"]',
    );
    fireEvent.change(input!, { target: { files: [file] } });
    const composer = await screen.findByLabelText("Message");
    fireEvent.change(composer, { target: { value: "See attached" } });
    fireEvent.keyDown(composer, { key: "Enter", code: "Enter" });

    await waitFor(() =>
      expect(uploadRequestAttachment).toHaveBeenCalledWith(
        "req-1",
        file,
        {
          visibility: "customer_visible",
          messageId: "sent-message",
        },
      ),
    );
  });

  it("progressively loads older updates instead of fetching an unbounded history", async () => {
    routeApi(
      detail({
        pagination: {
          messages: { offset: 0, limit: 50, hasMore: true },
          history: { offset: 0, limit: 50, hasMore: false },
        },
      }),
    );
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Load earlier updates" }),
    );
    await waitFor(() =>
      expect(
        apiRequest.mock.calls.some(([url]) =>
          String(url).includes("messagesOffset=3"),
        ),
      ).toBe(true),
    );
  });
});

describe("role-aware context", () => {
  it("shows staff-only serial and workflow to an authorized admin", async () => {
    routeApi();
    renderPage();

    expect(await screen.findByText("Serial number")).toBeInTheDocument();
    expect(screen.getByText("INTERNAL-123456789")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Workflow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reassign" })).toBeInTheDocument();
  });

  it("never exposes serial, internal notes, workflow, or assignment to a customer", async () => {
    setRole("customer");
    routeApi(
      detail({
        request: { ...request, serialNumber: null },
        messages: messages.filter(
          (message) => message.visibility === "customer_visible",
        ),
        history: [],
        customer: null,
      }),
    );
    renderPage();

    await screen.findByRole("heading", { name: "Ink issue — molor ml" });
    expect(screen.queryByText("Serial number")).toBeNull();
    expect(screen.queryByText("INTERNAL-123456789")).toBeNull();
    expect(screen.queryByText("Replacement pump is covered by warranty.")).toBeNull();
    expect(screen.queryByRole("tab", { name: "Workflow" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Reassign" })).toBeNull();
  });

  it("requires confirmation before reopening or archiving", async () => {
    routeApi();
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Update status" }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Reopen request" }),
    );
    expect(
      await screen.findByRole("alertdialog"),
    ).toHaveTextContent("Reopen this request?");
    expect(
      apiRequest.mock.calls.some(
        ([url, options]) =>
          url.endsWith("/status") && options?.method === "POST",
      ),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Archive request" }));
    expect(
      await screen.findByRole("alertdialog"),
    ).toHaveTextContent("Archive this request?");
  });
});

describe("attachments and activity", () => {
  it("shows uploaded attachments inside the matching conversation message", async () => {
    routeApi();
    renderPage();

    const messageText = await screen.findByText(/The ink pressure drops/);
    const messageArticle = messageText.closest("article");
    const mediaGroup = messageArticle?.querySelector(
      "[data-message-attachments]",
    );
    const textBubble = messageArticle?.querySelector("[data-message-text]");
    const previews = await screen.findAllByRole("button", {
      name: /^Preview Photo ·/,
    });
    const preview = previews.at(-1)!;

    expect(mediaGroup).toBeInTheDocument();
    expect(textBubble).toBeInTheDocument();
    expect(mediaGroup?.contains(textBubble ?? null)).toBe(false);
    expect(mediaGroup?.nextElementSibling).toBe(textBubble);
    expect(mediaGroup).not.toHaveTextContent("Photo ·");
    expect(preview).toHaveClass("h-24", "w-40");

    fireEvent.click(preview);
    expect(await screen.findByRole("dialog")).toHaveTextContent("image/jpeg");
  });

  it("uses a compact attachment tile with a safe label and preview dialog", async () => {
    routeApi();
    renderPage();

    const filesTab = await screen.findByRole("tab", { name: /^Files/ });
    fireEvent.mouseDown(filesTab, { button: 0 });
    fireEvent.click(filesTab);
    const previews = await screen.findAllByRole("button", {
      name: /^Preview Photo ·/,
    });
    const preview = previews.at(-1)!;
    expect(preview).toBeInTheDocument();
    expect(screen.queryByText(attachment.fileName)).toBeNull();
    fireEvent.click(preview);
    expect(await screen.findByRole("dialog")).toHaveTextContent("image/jpeg");
    expect(
      screen.getByRole("link", { name: "Open or download" }),
    ).toHaveAttribute("href", attachment.url);
  });

  it("renders human-readable activity instead of raw event identifiers", async () => {
    routeApi();
    renderPage();

    const activityTab = await screen.findByRole("tab", { name: "Activity" });
    fireEvent.mouseDown(activityTab, { button: 0 });
    fireEvent.click(activityTab);
    expect(
      await screen.findByText("Changed status from In Progress to Resolved"),
    ).toBeInTheDocument();
    expect(screen.queryByText("status_changed")).toBeNull();
  });

  it("shows the latest five activity events before offering view all", async () => {
    const history = Array.from({ length: 7 }, (_, index) => ({
      id: `history-${index + 1}`,
      requestId: "req-1",
      actorId: "engineer-1",
      actorRole: "engineer",
      eventType: "status_changed",
      metadata: {
        from: index % 2 === 0 ? "in_progress" : "triaged",
        to: index % 2 === 0 ? "resolved" : "in_progress",
      },
      createdAt: `2026-06-11T18:${String(40 + index).padStart(2, "0")}:00.000Z`,
    }));
    routeApi(detail({ history }));
    renderPage();

    const activityTab = await screen.findByRole("tab", { name: "Activity" });
    fireEvent.mouseDown(activityTab, { button: 0 });
    fireEvent.click(activityTab);

    expect(await screen.findAllByTestId("request-activity-entry")).toHaveLength(
      5,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "View all activity" }),
    );
    expect(screen.getAllByTestId("request-activity-entry")).toHaveLength(7);
    expect(
      screen.queryByRole("button", { name: "View all activity" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse activity" }),
    );
    expect(screen.getAllByTestId("request-activity-entry")).toHaveLength(5);
    expect(
      screen.getByRole("button", { name: "View all activity" }),
    ).toBeInTheDocument();
  });
});
