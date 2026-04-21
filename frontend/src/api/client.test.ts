import { describe, it, expect, vi, beforeEach } from "vitest";
import MockAdapter from "axios-mock-adapter";
import { api, setAdminToken } from "./client";

describe("api 401 handler", () => {
  const assignMock = vi.fn();
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign: assignMock, href: "/current" },
      writable: true,
    });
    assignMock.mockClear();
    setAdminToken("old-token");
  });

  it("clears token and redirects to /admin/login on 401", async () => {
    const mock = new MockAdapter(api);
    mock.onGet("/ping").reply(401);
    await expect(api.get("/ping")).rejects.toBeTruthy();
    expect(sessionStorage.getItem("matrix-admin-token")).toBeNull();
    expect(assignMock).toHaveBeenCalledWith("/admin/login");
  });
});
