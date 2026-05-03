import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import Home from "./page";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("Main Menu (page.tsx)", () => {
  it("renders Play, Deck Builder, and Settings buttons", () => {
    const { container } = render(<Home />);
    expect(container.textContent).toContain("Play");
    expect(container.textContent).toContain("Deck Builder");
    expect(container.textContent).toContain("Settings");
  });

  it("links to /game, /deck-builder, /settings", () => {
    const { container } = render(<Home />);
    const links = container.querySelectorAll("a");
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/game");
    expect(hrefs).toContain("/deck-builder");
    expect(hrefs).toContain("/settings");
  });

  it("Play links to /game", () => {
    const { container } = render(<Home />);
    const playLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Play"),
    );
    expect(playLink).toBeTruthy();
    expect(playLink!.getAttribute("href")).toBe("/game");
  });

  it("Deck Builder links to /deck-builder", () => {
    const { container } = render(<Home />);
    const link = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Deck Builder"),
    );
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/deck-builder");
  });

  it("Settings links to /settings", () => {
    const { container } = render(<Home />);
    const link = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Settings"),
    );
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/settings");
  });

  it("renders the game title", () => {
    const { container } = render(<Home />);
    expect(container.textContent).toContain("三国卡牌");
  });

  it("has exactly three navigation links", () => {
    const { container } = render(<Home />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(3);
  });

  it("does not render any broken or empty links", () => {
    const { container } = render(<Home />);
    const links = container.querySelectorAll("a");
    links.forEach((link) => {
      expect(link.getAttribute("href")).toBeTruthy();
      expect(link.getAttribute("href")).not.toBe("#");
    });
  });
});
