import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "@/test/render";
import { AdminLogin } from "./AdminLogin";

vi.mock("@/api/client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getAdminToken: () => null,
  setAdminToken: vi.fn(),
  clearAdminToken: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { api } from "@/api/client";
const mockPost = vi.mocked(api.post);

describe("AdminLogin", () => {
  afterEach(() => {
    mockPost.mockReset();
    localStorage.clear();
  });

  it("renders the teal eyebrow 'Admin · access'", () => {
    renderWithProviders(<AdminLogin />);
    expect(screen.getByText("Admin · access")).toBeInTheDocument();
  });

  it("renders the Sign in button", () => {
    renderWithProviders(<AdminLogin />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("renders the amber top stripe span with bg-amber and h-1 classes", () => {
    const { container } = renderWithProviders(<AdminLogin />);
    const stripe = container.querySelector("span.bg-amber.h-1");
    expect(stripe).toBeInTheDocument();
  });

  it("calls api.post with { password } on /admin/login when form is submitted", async () => {
    localStorage.clear();
    mockPost.mockResolvedValue({ data: { token: "tok123" } });
    renderWithProviders(<AdminLogin />);

    const input = screen.getByLabelText(/password/i);
    fireEvent.change(input, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith("/admin/login", {
      password: "secret",
      name: undefined,
    });
  });

  it("sends the stored display name as 'name' when one is saved locally", async () => {
    localStorage.setItem("matrix.displayName", "Alice");
    mockPost.mockResolvedValue({ data: { token: "tok123" } });
    renderWithProviders(<AdminLogin />);

    const input = screen.getByLabelText(/password/i);
    fireEvent.change(input, { target: { value: "secret" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
    expect(mockPost).toHaveBeenCalledWith("/admin/login", {
      password: "secret",
      name: "Alice",
    });
    localStorage.clear();
  });
});
