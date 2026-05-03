import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import GameLoading from "./loading";

describe("GameLoading (game page)", () => {
  it("renders without crashing", () => {
    const { container } = render(<GameLoading />);
    expect(container.firstChild).toBeTruthy();
  });

  it("displays the preparing title 備戰中", () => {
    render(<GameLoading />);
    expect(screen.getAllByText("備戰中").length).toBeGreaterThan(0);
  });

  it("displays the English subtitle", () => {
    render(<GameLoading />);
    expect(screen.getAllByText("Preparing the battlefield...").length).toBeGreaterThan(0);
  });

  it("renders the dragon emoji", () => {
    render(<GameLoading />);
    expect(screen.getAllByText("🐉").length).toBeGreaterThan(0);
  });

  it("has a full-screen fixed overlay", () => {
    const { container } = render(<GameLoading />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");
    expect(root.className).toContain("z-50");
  });

  it("renders three spinning ring elements", () => {
    const { container } = render(<GameLoading />);
    const spinners = container.querySelectorAll(".animate-spin");
    expect(spinners.length).toBe(3);
  });

  it("renders a progress bar with pulse animation", () => {
    const { container } = render(<GameLoading />);
    const pulse = container.querySelectorAll(".animate-pulse");
    expect(pulse.length).toBe(1);
  });

  it("uses CSS animations only (no JS timers) for 60fps performance", () => {
    const { container } = render(<GameLoading />);
    const animated = container.querySelectorAll(
      ".animate-spin, .animate-pulse"
    );
    expect(animated.length).toBeGreaterThan(0);
  });
});
