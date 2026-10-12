import { describe, test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LaboratoriesDirectory, type DirectoryLaboratory } from "./LaboratoriesDirectory";

// The map loads Leaflet; the directory's own behaviour is what is under test.
vi.mock("./LaboratoryMap", () => ({
  LaboratoryMap: ({ laboratories }: { laboratories: unknown[] }) => <div>Map of {laboratories.length} laboratories</div>,
}));

function lab(overrides: Partial<DirectoryLaboratory>): DirectoryLaboratory {
  return {
    id: "1",
    slNo: 1,
    name: "AES Laboratories (P) Ltd",
    city: "Noida",
    state: "Uttar Pradesh",
    stateRaw: "U.P.",
    type: "Private",
    oslCode: "8117716",
    recognitionValidUpto: "2027-02-14",
    recognitionValidUptoRaw: "14.02.2027",
    currentStatus: "Active",
    remarks: null,
    lat: null,
    lng: null,
    recognitionExpired: false,
    ...overrides,
  };
}

const LABS: DirectoryLaboratory[] = [
  lab({}),
  lab({ id: "2", slNo: 2, name: "Arbro Pharmaceutical Private Limited", city: "New Delhi", state: "Delhi", oslCode: "8000002", recognitionValidUpto: "2026-01-14", recognitionValidUptoRaw: "14.01.2026", recognitionExpired: true }),
  lab({ id: "3", slNo: 3, name: "Mumbai Test House", city: "Mumbai", state: "Maharashtra", oslCode: "8000003", currentStatus: "Suspended", remarks: "Suspended on 01.03.2026 pending re-audit." }),
  lab({ id: "4", slNo: 4, name: "Pune Calibration Centre", city: "Pune", state: "Maharashtra", oslCode: "8000004", type: "Government" }),
];

const resultNames = () => screen.queryAllByText(/Laborator|Pharmaceutical|Test House|Calibration/, { selector: "p.font-semibold" }).map((p) => p.textContent);

describe("LaboratoriesDirectory", () => {
  test("lists every laboratory with a count", () => {
    render(<LaboratoriesDirectory laboratories={LABS} />);
    expect(screen.getByText("4 of 4 recognised laboratories")).toBeInTheDocument();
    expect(resultNames()).toHaveLength(4);
  });

  test("search matches name, city or OSL code", async () => {
    render(<LaboratoriesDirectory laboratories={LABS} />);
    const search = screen.getByLabelText("Search recognised laboratories");
    const user = userEvent.setup();
    await user.type(search, "pune");
    expect(resultNames()).toEqual(["Pune Calibration Centre"]);
    await user.clear(search);
    await user.type(search, "8000003");
    expect(resultNames()).toEqual(["Mumbai Test House"]);
  });

  test("state and status filters combine", async () => {
    render(<LaboratoriesDirectory laboratories={LABS} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Filter by state"), "Maharashtra");
    expect(resultNames()).toHaveLength(2);
    await user.selectOptions(screen.getByLabelText("Filter by recognition status"), "Active");
    expect(resultNames()).toEqual(["Pune Calibration Centre"]);
  });

  test("the by-state bar toggles the state filter", async () => {
    render(<LaboratoriesDirectory laboratories={LABS} />);
    const user = userEvent.setup();
    const bar = screen.getByRole("button", { name: /^Maharashtra/ });
    await user.click(bar);
    expect(bar).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("2 of 4 recognised laboratories")).toBeInTheDocument();
    await user.click(bar);
    expect(screen.getByText("4 of 4 recognised laboratories")).toBeInTheDocument();
  });

  test("validity dates are the calendar date in every time zone", () => {
    // "2027-02-14" parses as UTC midnight, so it must be formatted in UTC;
    // in the viewer's zone it reads as 13 Feb anywhere west of UTC. The test
    // machine's own zone can't show that, so assert the formatting option.
    const spy = vi.spyOn(Date.prototype, "toLocaleDateString");
    render(<LaboratoriesDirectory laboratories={[lab({})]} />);
    expect(screen.getByText("Recognition valid until 14 Feb 2027")).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith("en-IN", expect.objectContaining({ timeZone: "UTC" }));
    spy.mockRestore();
  });

  test("a lapsed validity date is called out next to the source's own status", () => {
    render(<LaboratoriesDirectory laboratories={LABS} />);
    const row = screen.getByText("Arbro Pharmaceutical Private Limited").closest("li")!;
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(within(row).getByText("Validity lapsed")).toBeInTheDocument();
    expect(within(row).getByText(/Recognition validity lapsed on 14 Jan 2026/)).toBeInTheDocument();
    expect(within(row).queryByText(/valid until/)).not.toBeInTheDocument();
  });

  test("status history expands on request", async () => {
    render(<LaboratoriesDirectory laboratories={LABS} />);
    const user = userEvent.setup();
    expect(screen.queryByText(/pending re-audit/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Show status history" }));
    expect(screen.getByText("Suspended on 01.03.2026 pending re-audit.")).toBeInTheDocument();
  });

  test("no matches says so; the map view shows the filtered set", async () => {
    render(<LaboratoriesDirectory laboratories={LABS} />);
    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText("Filter by state"), "Maharashtra");
    await user.click(screen.getByRole("button", { name: "Map" }));
    expect(screen.getByText("Map of 2 laboratories")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "List" }));
    await user.type(screen.getByLabelText("Search recognised laboratories"), "zzz");
    expect(screen.getByText("No recognised laboratory matches these filters.")).toBeInTheDocument();
  });
});

