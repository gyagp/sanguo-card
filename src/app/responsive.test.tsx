import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Home from "./page";
import CardsPage from "./cards/page";

// Mock next/link
import { vi } from "vitest";
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: React.ReactNode; href: string; className?: string }) => (
    <a {...props}>{children}</a>
  ),
}));

describe("Main menu responsive design", () => {
  it("has max-w-md constraint to prevent overflow on narrow screens", () => {
    const { container } = render(<Home />);
    const main = container.querySelector("main");
    expect(main?.className).toContain("max-w-md");
    expect(main?.className).toContain("w-full");
  });

  it("uses mobile-first padding with md breakpoint", () => {
    const { container } = render(<Home />);
    const main = container.querySelector("main");
    expect(main?.className).toContain("px-4");
    expect(main?.className).toContain("md:px-8");
  });

  it("nav takes full width", () => {
    const { container } = render(<Home />);
    const nav = container.querySelector("nav");
    expect(nav?.className).toContain("w-full");
  });
});

describe("Card browser responsive design", () => {
  it("uses mobile-first padding", () => {
    const { container } = render(<CardsPage />);
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain("p-4");
    expect(wrapper?.className).toContain("md:p-8");
  });

  it("filter buttons stack vertically on mobile, row on md+", () => {
    const { container } = render(<CardsPage />);
    const filterContainer = container.querySelector(".flex.flex-col.items-center");
    expect(filterContainer).not.toBeNull();
    expect(filterContainer?.className).toContain("md:flex-row");
  });

  it("card grid uses smaller gap on mobile", () => {
    const { container } = render(<CardsPage />);
    const cardGrid = container.querySelectorAll(".flex.flex-wrap.justify-center");
    const lastGrid = cardGrid[cardGrid.length - 1];
    expect(lastGrid?.className).toContain("gap-3");
    expect(lastGrid?.className).toContain("md:gap-6");
  });

  it("filter buttons wrap on narrow screens", () => {
    const { container } = render(<CardsPage />);
    const filterGroups = container.querySelectorAll(".flex.flex-wrap.items-center.justify-center");
    expect(filterGroups.length).toBeGreaterThanOrEqual(3);
  });
});
