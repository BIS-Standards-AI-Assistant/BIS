import { describe, test, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FeedbackControl } from "./FeedbackControl";

afterEach(() => vi.unstubAllGlobals());

const STANDARD = "IS 302 (Part 2/Sec 6):2009";

async function open(props: Partial<Parameters<typeof FeedbackControl>[0]> = {}) {
  const user = userEvent.setup();
  render(<FeedbackControl query="cooking range" standardNumber={STANDARD} standardTitle="Cooking ranges" {...props} />);
  await user.click(screen.getByRole("button", { name: "Report an issue with this result" }));
  return user;
}

describe("FeedbackControl", () => {
  test("starts collapsed and can be cancelled", async () => {
    const user = await open();
    expect(screen.getByLabelText("What's wrong?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByLabelText("What's wrong?")).not.toBeInTheDocument();
  });

  test("submits the query, standard, chosen reason and comment", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchSpy);
    const user = await open();

    await user.selectOptions(screen.getByLabelText("What's wrong?"), "outdated_information");
    await user.type(screen.getByLabelText("Optional detail"), "Superseded by the 2023 edition.");
    await user.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/v1/feedback");
    expect(JSON.parse(init.body)).toEqual({
      query: "cooking range",
      standardNumber: STANDARD,
      standardTitle: "Cooking ranges",
      reason: "outdated_information",
      comment: "Superseded by the 2023 edition.",
    });
    // Intake only: no claim that anything was fixed.
    expect(await screen.findByText(/will be reviewed before it affects future results/)).toBeInTheDocument();
  });

  test("an empty comment is omitted rather than sent as an empty string", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    vi.stubGlobal("fetch", fetchSpy);
    const user = await open();
    await user.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body)).not.toHaveProperty("comment");
  });

  test("a failed submission is announced and can be retried", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const user = await open();
    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't submit — try again.");
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
  });

  test("the comment is capped at the server's 2000-character limit", async () => {
    await open();
    expect(screen.getByLabelText("Optional detail")).toHaveAttribute("maxLength", "2000");
  });

  test("ids are valid and unique even for the same standard twice on a page", async () => {
    const user = userEvent.setup();
    render(
      <>
        <FeedbackControl query="q" standardNumber={STANDARD} />
        <FeedbackControl query="q" standardNumber={STANDARD} />
      </>,
    );
    for (const button of screen.getAllByRole("button", { name: "Report an issue with this result" })) await user.click(button);
    const selects = screen.getAllByLabelText("What's wrong?");
    expect(selects).toHaveLength(2);
    expect(selects[0].id).not.toBe(selects[1].id);
    for (const select of selects) expect(select.id).not.toMatch(/\s/);
  });
});
