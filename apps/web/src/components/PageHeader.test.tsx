import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import PageHeader from "./PageHeader";

const PAGES_DIR = path.join(__dirname, "../pages");

/** Portal pages that own a top-level page title. Detail views (a request, a
 *  machine profile, a person) lead with breadcrumbs/identity instead. */
const TITLED_PAGES = [
  "AdminDashboardPage.tsx",
  "RequestsPage.tsx",
  "QueuePage.tsx",
  "PeopleActivityPage.tsx",
  "CustomerActivityPage.tsx",
  "MachinesPage.tsx",
  "UsersPage.tsx",
  "AccountPage.tsx",
];

describe("PageHeader", () => {
  it("renders the title as the page h1 with its description", () => {
    render(<PageHeader icon={Activity} title="People Activity" description="What everyone is doing." />);
    expect(screen.getByRole("heading", { level: 1, name: "People Activity" })).toBeInTheDocument();
    expect(screen.getByText("What everyone is doing.")).toBeInTheDocument();
  });

  it("renders without a description or action", () => {
    render(<PageHeader icon={Activity} title="Queue" />);
    expect(screen.getByRole("heading", { level: 1, name: "Queue" })).toBeInTheDocument();
  });

  it("places the action alongside the title", () => {
    render(
      <PageHeader icon={Activity} title="Users" action={<button type="button">Invite staff</button>} />,
    );
    expect(screen.getByRole("button", { name: "Invite staff" })).toBeInTheDocument();
  });

  it("hides the decorative icon from assistive tech", () => {
    const { container } = render(<PageHeader icon={Activity} title="Queue" />);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("caps the description width so it cannot wrap raggedly across a wide table", () => {
    const { container } = render(
      <PageHeader icon={Activity} title="T" description="A fairly long supporting sentence." />,
    );
    expect(container.querySelector("p")!.className).toContain("max-w-2xl");
  });
});

describe("every titled portal page uses the shared header", () => {
  for (const file of TITLED_PAGES) {
    it(`${file} renders PageHeader and declares no ad-hoc page h1`, () => {
      const source = readFileSync(path.join(PAGES_DIR, file), "utf8");
      expect(source).toContain("<PageHeader");
      expect(source).toContain('from "@/components/PageHeader"');
      // A hand-rolled <h1> would reintroduce the drift this component removes.
      expect(source).not.toMatch(/<h1[^>]*className="lp-display text-2xl font-bold/);
    });
  }

  it("catches any titled page added later without the shared header", () => {
    // Guards against a new page quietly reintroducing its own heading style.
    const suspects = readdirSync(PAGES_DIR)
      .filter((f) => f.endsWith("Page.tsx") && !f.endsWith(".test.tsx"))
      .filter((f) => {
        const src = readFileSync(path.join(PAGES_DIR, f), "utf8");
        return /<h1[^>]*className="lp-display text-2xl font-bold/.test(src);
      });
    expect(suspects).toEqual([]);
  });
});
