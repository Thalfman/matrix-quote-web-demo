import "@testing-library/jest-dom";

// Recharts uses ResizeObserver which jsdom doesn't implement.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom doesn't implement Element.scrollIntoView; SingleQuote calls it inside
// a requestAnimationFrame after submit, so unhandled rejections fail the run.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
