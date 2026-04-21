import { it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RootErrorBoundary } from "./RootErrorBoundary";

function Boom(): JSX.Element {
  throw new Error("boom");
}

it("shows the fallback when a child throws", () => {
  const originalError = console.error;
  console.error = () => {}; // suppress React's error log
  render(
    <RootErrorBoundary>
      <Boom />
    </RootErrorBoundary>
  );
  expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
  expect(screen.getByText(/boom/)).toBeInTheDocument();
  console.error = originalError;
});
