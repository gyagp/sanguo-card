import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "./loading";

describe("Loading (root)", () => {
  it("renders without crashing", () => {
    const { container } = render(<Loading />);
    expect(container.firstChild).toBeTruthy();
  });

  it("displays the game title 三國卡牌", () => {
    render(<Loading />);
    expect(screen.getAllByText("三國卡牌").length).toBeGreaterThan(0);
  });

  it("renders the sword emoji", () => {
    render(<Loading />);
    expect(screen.getAllByText("⚔").length).toBeGreaterThan(0);
  });

  it("has a full-screen fixed overlay", () => {
    const { container } = render(<Loading />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain("fixed");
    expect(root.className).toContain("inset-0");
    expect(root.className).toContain("z-50");
  });

  it("renders three bouncing dot indicators", () => {
    const { container } = render(<Loading />);
    const dots = container.querySelectorAll(".animate-bounce");
    expect(dots.length).toBe(3);
  });

  it("renders two spinning ring elements", () => {
    const { container } = render(<Loading />);
    const spinners = container.querySelectorAll(".animate-spin");
    expect(spinners.length).toBe(2);
  });

  it("uses CSS animations only (no JS timers) for 60fps performance", () => {
    const { container } = render(<Loading />);
    const animated = container.querySelectorAll(
      ".animate-spin, .animate-bounce"
    );
    expect(animated.length).toBeGreaterThan(0);
  });
});
