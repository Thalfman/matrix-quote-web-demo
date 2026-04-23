import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render } from "@testing-library/react";

import { DemoLayout } from "./DemoLayout";

// DemoLayout renders <Outlet />, which is empty in test context - that's fine.
// We're only testing the sidebar structure.

function renderLayout(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <DemoLayout />
    </MemoryRouter>,
  );
}

describe("DemoLayout sidebar structure", () => {
  it("renders REAL DATA label before SYNTHETIC DATA label in the DOM", () => {
    renderLayout();
    // The section labels are plain <div>s with eyebrow text - use queryAllByText with regex.
    const realLabel = screen.getByText(/real data/i);
    const syntheticLabel = screen.getByText(/synthetic data/i);
    expect(realLabel).toBeInTheDocument();
    expect(syntheticLabel).toBeInTheDocument();
    // compareDocumentPosition: if A precedes B, B.compareDocumentPosition(A) includes DOCUMENT_POSITION_PRECEDING (4)
    const position = syntheticLabel.compareDocumentPosition(realLabel);
    expect(position & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it("has Quote, Compare, and Business Insights links under each section", () => {
    renderLayout();
    const links = screen.getAllByRole("link");
    const quoteLinks = links.filter((l) => l.textContent === "Quote");
    // Sidebar Compare links point to /compare/compare and /ml/compare (not the mobile /compare/quote link)
    const sidebarCompareLinks = links.filter(
      (l) =>
        l.textContent === "Compare" &&
        ((l as HTMLAnchorElement).href.includes("/compare/compare") ||
          (l as HTMLAnchorElement).href.includes("/ml/compare")),
    );
    const insightsLinks = links.filter((l) => l.textContent === "Business Insights");
    expect(quoteLinks).toHaveLength(2);
    expect(sidebarCompareLinks).toHaveLength(2);
    expect(insightsLinks).toHaveLength(2);

    // Within each section, Quote must precede Compare, which precedes Business Insights.
    const compareQuote = links.find(
      (l) => l.textContent === "Quote" && (l as HTMLAnchorElement).href.includes("/compare/quote"),
    );
    const compareCompare = links.find(
      (l) =>
        l.textContent === "Compare" &&
        (l as HTMLAnchorElement).href.includes("/compare/compare"),
    );
    const compareInsights = links.find(
      (l) =>
        l.textContent === "Business Insights" &&
        (l as HTMLAnchorElement).href.includes("/compare/insights"),
    );
    expect(compareQuote).toBeTruthy();
    expect(compareCompare).toBeTruthy();
    expect(compareInsights).toBeTruthy();
    const cmpPos = compareInsights!.compareDocumentPosition(compareQuote!);
    expect(cmpPos & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();

    // ML-section Quote precedes ML-section Compare, which precedes ML-section Insights.
    const mlQuote = links.find(
      (l) => l.textContent === "Quote" && (l as HTMLAnchorElement).href.includes("/ml/quote"),
    );
    const mlCompare = links.find(
      (l) =>
        l.textContent === "Compare" && (l as HTMLAnchorElement).href.includes("/ml/compare"),
    );
    const mlInsights = links.find(
      (l) =>
        l.textContent === "Business Insights" &&
        (l as HTMLAnchorElement).href.includes("/ml/insights"),
    );
    expect(mlQuote).toBeTruthy();
    expect(mlCompare).toBeTruthy();
    expect(mlInsights).toBeTruthy();
    const mlPos = mlInsights!.compareDocumentPosition(mlQuote!);
    expect(mlPos & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it("sidebar contains nav with aria-label='Primary'", () => {
    const { container } = renderLayout();
    const nav = container.querySelector("nav[aria-label='Primary']");
    expect(nav).not.toBeNull();
  });

  it("demo controls panel appears in the DOM before the theme toggle", () => {
    renderLayout();
    const demoControls = screen.getByRole("group", { name: /demo controls/i });
    const themeToggle = screen.getByRole("button", { name: /toggle dark mode/i });
    // demoControls should precede themeToggle: themeToggle.compareDocumentPosition(demoControls) has PRECEDING bit
    const position = themeToggle.compareDocumentPosition(demoControls);
    expect(position & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy();
  });

  it("theme toggle is the last focusable element inside the aside", () => {
    const { container } = renderLayout();
    const aside = container.querySelector("aside");
    expect(aside).not.toBeNull();
    const focusables = aside!.querySelectorAll(
      '[tabindex], button, a, input, [role="button"]',
    );
    const last = focusables[focusables.length - 1];
    expect(last).toBeTruthy();
    // The theme toggle button has aria-label "Toggle dark mode"
    expect(last.getAttribute("aria-label")).toMatch(/toggle dark mode/i);
  });

  it("has a Home link in the sidebar", () => {
    renderLayout();
    expect(screen.getByRole("link", { name: /^home$/i })).toBeInTheDocument();
  });
});

describe("DemoLayout mobile back button", () => {
  it("hides the Back to demo home link on the home route", () => {
    renderLayout("/");
    const header = screen.getByTestId("mobile-header");
    expect(
      within(header).queryByRole("link", { name: /back to demo home/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the Back to demo home link on non-home routes and points at /", () => {
    renderLayout("/compare/insights");
    const header = screen.getByTestId("mobile-header");
    const back = within(header).getByRole("link", { name: /back to demo home/i });
    expect(back).toBeInTheDocument();
    expect((back as HTMLAnchorElement).getAttribute("href")).toBe("/");
  });
});

describe("DemoLayout mobile tool switch", () => {
  function toolNav(route: string) {
    renderLayout(route);
    const header = screen.getByTestId("mobile-header");
    return within(header).getByRole("navigation", { name: /switch tool/i });
  }

  it("highlights Compare segment on /compare/*", () => {
    const nav = toolNav("/compare/insights");
    const compareSegment = within(nav).getByRole("link", { name: "Compare" });
    expect(compareSegment.className).toContain("bg-ink");
    expect(compareSegment.getAttribute("aria-current")).toBe("page");
  });

  it("highlights ML segment on /ml/*", () => {
    const nav = toolNav("/ml/quote");
    const mlSegment = within(nav).getByRole("link", { name: "ML" });
    expect(mlSegment.className).toContain("bg-ink");
  });

  it("Compare segment preserves the current sub-view (insights → /compare/insights)", () => {
    const nav = toolNav("/ml/insights");
    const compareSegment = within(nav).getByRole("link", { name: "Compare" });
    expect(
      (compareSegment as HTMLAnchorElement).getAttribute("href"),
    ).toBe("/compare/insights");
  });

  it("ML segment preserves the current sub-view (compare → /ml/compare)", () => {
    const nav = toolNav("/compare/compare");
    const mlSegment = within(nav).getByRole("link", { name: "ML" });
    expect((mlSegment as HTMLAnchorElement).getAttribute("href")).toBe("/ml/compare");
  });

  it("tool segments default to /<tool>/quote on the home route", () => {
    const nav = toolNav("/");
    const compareSegment = within(nav).getByRole("link", { name: "Compare" });
    const mlSegment = within(nav).getByRole("link", { name: "ML" });
    expect((compareSegment as HTMLAnchorElement).getAttribute("href")).toBe("/compare/quote");
    expect((mlSegment as HTMLAnchorElement).getAttribute("href")).toBe("/ml/quote");
  });
});

describe("DemoLayout mobile sub-view tabs", () => {
  it("does not render sub-view tabs on the home route", () => {
    renderLayout("/");
    const header = screen.getByTestId("mobile-header");
    expect(within(header).queryByRole("navigation", { name: /sub-view/i })).toBeNull();
  });

  it("renders Quote / Compare / Insights tabs on /compare/*", () => {
    renderLayout("/compare/quote");
    const header = screen.getByTestId("mobile-header");
    const subNav = within(header).getByRole("navigation", { name: /sub-view/i });
    const labels = within(subNav).getAllByRole("link").map((l) => l.textContent);
    expect(labels).toEqual(["Quote", "Compare", "Insights"]);
  });

  it("points every tab at the current tool prefix (/ml on /ml/insights)", () => {
    renderLayout("/ml/insights");
    const header = screen.getByTestId("mobile-header");
    const subNav = within(header).getByRole("navigation", { name: /sub-view/i });
    const links = within(subNav).getAllByRole("link") as HTMLAnchorElement[];
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toEqual(["/ml/quote", "/ml/compare", "/ml/insights"]);
  });

  it("highlights only the current sub-view tab", () => {
    renderLayout("/compare/insights");
    const header = screen.getByTestId("mobile-header");
    const subNav = within(header).getByRole("navigation", { name: /sub-view/i });
    const quote = within(subNav).getByRole("link", { name: "Quote" });
    const compare = within(subNav).getByRole("link", { name: "Compare" });
    const insights = within(subNav).getByRole("link", { name: "Insights" });
    expect(insights.className).toContain("bg-teal");
    expect(insights.getAttribute("aria-current")).toBe("page");
    expect(quote.className).not.toContain("bg-teal");
    expect(compare.className).not.toContain("bg-teal");
  });
});

describe("DemoLayout aria-current active link", () => {
  it("marks Compare Quote link as aria-current=page when at /compare/quote", () => {
    renderLayout("/compare/quote");
    const links = screen.getAllByRole("link");
    const compareQuote = links.find(
      (l) =>
        l.textContent === "Quote" &&
        (l as HTMLAnchorElement).href.includes("/compare/quote"),
    );
    expect(compareQuote).toBeTruthy();
    expect(compareQuote!.getAttribute("aria-current")).toBe("page");

    // ML Quote link must NOT have aria-current
    const mlQuote = links.find(
      (l) =>
        l.textContent === "Quote" && (l as HTMLAnchorElement).href.includes("/ml/quote"),
    );
    expect(mlQuote!.getAttribute("aria-current")).not.toBe("page");
  });

  it("marks ML Business Insights link as aria-current=page when at /ml/insights", () => {
    renderLayout("/ml/insights");
    const links = screen.getAllByRole("link");
    const mlInsights = links.find(
      (l) =>
        l.textContent === "Business Insights" &&
        (l as HTMLAnchorElement).href.includes("/ml/insights"),
    );
    expect(mlInsights).toBeTruthy();
    expect(mlInsights!.getAttribute("aria-current")).toBe("page");

    // Compare Business Insights must NOT be current
    const compareInsights = links.find(
      (l) =>
        l.textContent === "Business Insights" &&
        (l as HTMLAnchorElement).href.includes("/compare/insights"),
    );
    expect(compareInsights!.getAttribute("aria-current")).not.toBe("page");
  });
});
