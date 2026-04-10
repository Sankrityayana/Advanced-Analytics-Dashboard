import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./pages/Dashboard", () => ({
  default: () => <div>Dashboard Page</div>,
}));

vi.mock("./pages/Analytics", () => ({
  default: () => <div>Analytics Page</div>,
}));

vi.mock("./pages/Predictions", () => ({
  default: () => <div>Predictions Page</div>,
}));

vi.mock("./pages/Forecasting", () => ({
  default: () => <div>Forecasting Page</div>,
}));

import App from "./App";

describe("App routing", () => {
  it("redirects root route to dashboard", async () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    expect(await screen.findByText("Dashboard Page")).toBeInTheDocument();
  });

  it("renders analytics page for /analytics", async () => {
    window.history.pushState({}, "", "/analytics");

    render(<App />);

    expect(await screen.findByText("Analytics Page")).toBeInTheDocument();
  });
});
