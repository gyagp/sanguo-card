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

vi.mock("../game/player-store", () => ({
  loadPlayer: vi.fn(() => ({
    gold: 200,
    xp: 150,
    level: 3,
    ownedCards: [],
  })),
}));

describe("Main Menu (page.tsx)", () => {
  it("renders Play, Deck Builder, and Settings buttons", () => {
    const { container } = render(<Home />);
    expect(container.textContent).toContain("开始对战");
    expect(container.textContent).toContain("组建卡组");
    expect(container.textContent).toContain("设置");
  });

  it("links to /game, /deck-builder, /settings, /collection", () => {
    const { container } = render(<Home />);
    const links = container.querySelectorAll("a");
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/game");
    expect(hrefs).toContain("/deck-builder");
    expect(hrefs).toContain("/settings");
    expect(hrefs).toContain("/collection");
  });

  it("Play links to /game", () => {
    const { container } = render(<Home />);
    const playLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("开始对战"),
    );
    expect(playLink).toBeTruthy();
    expect(playLink!.getAttribute("href")).toBe("/game");
  });

  it("Deck Builder links to /deck-builder", () => {
    const { container } = render(<Home />);
    const link = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("组建卡组"),
    );
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/deck-builder");
  });

  it("Settings links to /settings", () => {
    const { container } = render(<Home />);
    const link = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("设置"),
    );
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/settings");
  });

  it("Collection links to /collection", () => {
    const { container } = render(<Home />);
    const link = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("卡牌收藏"),
    );
    expect(link).toBeTruthy();
    expect(link!.getAttribute("href")).toBe("/collection");
  });

  it("renders the game title", () => {
    const { container } = render(<Home />);
    expect(container.textContent).toContain("三国卡牌");
  });

  it("has exactly seven navigation links", () => {
    const { container } = render(<Home />);
    const links = container.querySelectorAll("a");
    expect(links).toHaveLength(7);
  });

  it("does not render any broken or empty links", () => {
    const { container } = render(<Home />);
    const links = container.querySelectorAll("a");
    links.forEach((link) => {
      expect(link.getAttribute("href")).toBeTruthy();
      expect(link.getAttribute("href")).not.toBe("#");
    });
  });

  it("shows player level", () => {
    const { container } = render(<Home />);
    expect(container.textContent).toContain("Lv.3");
  });

  it("shows gold amount", () => {
    const { container } = render(<Home />);
    expect(container.textContent).toContain("200");
  });

  it("shows XP progress", () => {
    const { container } = render(<Home />);
    expect(container.textContent).toContain("经验值");
  });

  it("shows level unlock milestones", () => {
    const { container } = render(<Home />);
    expect(container.textContent).toContain("等级解锁");
    expect(container.textContent).toContain("基础对战");
    expect(container.textContent).toContain("商店");
    expect(container.textContent).toContain("组建卡组");
  });
});
