import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { LanguageProvider, __resetLanguageForTests, useLanguage } from "@/components/providers/LanguageProvider";

const HINDI = "हिन्दी";
const TAMIL = "தமிழ்";

function CurrentLang() {
  const { lang } = useLanguage();
  return <output aria-label="current language">{lang}</output>;
}

function renderSwitcher() {
  return render(
    <LanguageProvider>
      <LanguageSwitcher />
      <CurrentLang />
      <a href="#after">After the switcher</a>
    </LanguageProvider>,
  );
}

beforeEach(() => {
  __resetLanguageForTests();
  window.localStorage.removeItem("bis-lang");
});

afterEach(() => vi.restoreAllMocks());

describe("LanguageSwitcher: what assistive tech is told", () => {
  test("is a disclosure of buttons, not a listbox without arrow-key support", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    const trigger = screen.getByRole("button", { name: "Language: English" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    const list = screen.getByRole("list", { name: "Choose language" });
    expect(trigger).toHaveAttribute("aria-controls", list.id);
  });

  test("marks the current language and tags each name with its own language", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole("button", { name: "Language: English" }));

    expect(screen.getByRole("button", { name: "English" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: HINDI })).not.toHaveAttribute("aria-current");
    expect(screen.getByText(HINDI)).toHaveAttribute("lang", "hi");
  });

  test("languages without a translated UI are disabled", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole("button", { name: "Language: English" }));
    expect(screen.getByRole("button", { name: new RegExp(TAMIL) })).toBeDisabled();
  });
});

describe("LanguageSwitcher: keyboard", () => {
  test("Escape closes the list and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    const trigger = screen.getByRole("button", { name: "Language: English" });
    await user.click(trigger);
    await user.tab();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("list", { name: "Choose language" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  test("tabbing out of the list closes it", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole("button", { name: "Language: English" }));

    // Through English and Hindi; the disabled languages are skipped.
    await user.tab();
    await user.tab();
    await user.tab();
    expect(screen.getByRole("link", { name: "After the switcher" })).toHaveFocus();
    expect(screen.queryByRole("list", { name: "Choose language" })).not.toBeInTheDocument();
  });

  test("choosing a language closes the list and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole("button", { name: "Language: English" }));
    await user.click(screen.getByRole("button", { name: HINDI }));

    expect(screen.getByLabelText("current language")).toHaveTextContent("hi");
    expect(screen.getByRole("button", { name: "Language: Hindi" })).toHaveFocus();
  });
});

describe("LanguageProvider: switching never depends on storage", () => {
  test("still switches when localStorage refuses writes", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByRole("button", { name: "Language: English" }));
    await user.click(screen.getByRole("button", { name: HINDI }));

    expect(screen.getByLabelText("current language")).toHaveTextContent("hi");
    expect(document.documentElement.lang).toBe("hi");
  });

  test("the cookie is still written when localStorage refuses writes", async () => {
    document.cookie = "bis-lang=en;path=/";
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    const user = userEvent.setup();
    renderSwitcher();
    await user.click(screen.getByRole("button", { name: "Language: English" }));
    await user.click(screen.getByRole("button", { name: HINDI }));

    expect(document.cookie).toContain("bis-lang=hi");
  });

  test("follows a language change made in another tab", () => {
    renderSwitcher();
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "bis-lang", newValue: "hi" }));
    });
    expect(screen.getByLabelText("current language")).toHaveTextContent("hi");
  });

  test("ignores a stored value that isn't a language, including prototype names", () => {
    window.localStorage.setItem("bis-lang", "constructor");
    renderSwitcher();
    expect(screen.getByLabelText("current language")).toHaveTextContent("en");
  });
});
