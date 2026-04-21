import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { renderWithProviders } from "@/test/render";
import { UserPill } from "./UserPill";

// UserPill does not call api.get/post but the test render helper shares
// QueryClientProvider with the rest of the suite, so mock @/api/client to
// avoid any accidental network attempts from sibling queries.
vi.mock("@/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  getAdminToken: () => null,
  setAdminToken: vi.fn(),
  clearAdminToken: vi.fn(),
}));

const LS_KEY = "matrix.displayName";

describe("UserPill", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders 'Set name' when localStorage is empty", () => {
    renderWithProviders(<UserPill />);

    expect(screen.getByText("Set name")).toBeInTheDocument();
    // "Guest" is one word, so initials produces "G".
    expect(screen.getByText("G")).toBeInTheDocument();
  });

  it("renders initials derived from the stored name", () => {
    localStorage.setItem(LS_KEY, "Alice Doe");

    renderWithProviders(<UserPill />);

    expect(screen.getByText("AD")).toBeInTheDocument();
    expect(screen.getByText("Alice Doe")).toBeInTheDocument();
  });

  it("clicking pill calls prompt and updates displayed name when prompt returns a value", () => {
    const mockPrompt = vi.fn(() => "Bob Smith");
    vi.stubGlobal("prompt", mockPrompt);

    renderWithProviders(<UserPill />);

    fireEvent.click(screen.getByRole("button", { name: /edit display name/i }));

    expect(mockPrompt).toHaveBeenCalledOnce();
    expect(screen.getByText("BS")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(localStorage.getItem(LS_KEY)).toBe("Bob Smith");
  });
});
