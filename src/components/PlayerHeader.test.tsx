import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import PlayerHeader from "./PlayerHeader";
import { PlayerProfile } from "../game/progression";

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

const mockProfile: PlayerProfile = {
  gold: 250,
  xp: 150,
  level: 2,
  ownedCards: [],
};

vi.mock("../game/player-store", () => ({
  loadPlayer: vi.fn(() => mockProfile),
}));

describe("PlayerHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders player level", () => {
    const { container } = render(<PlayerHeader />);
    expect(container.textContent).toContain("Lv.2");
  });

  it("renders gold amount", () => {
    const { container } = render(<PlayerHeader />);
    expect(container.textContent).toContain("250");
  });

  it("renders XP progress bar", () => {
    const { container } = render(<PlayerHeader />);
    // XP progress: level 2, xp=150. Thresholds: level1=0, level2=100, level3=250.
    // current = 150-100 = 50, needed = 250-100 = 150, percent = 33
    expect(container.textContent).toContain("50/150");
  });

  it("renders as a header element", () => {
    const { container } = render(<PlayerHeader />);
    const header = container.querySelector("header");
    expect(header).toBeTruthy();
  });

  it("links back to home", () => {
    const { container } = render(<PlayerHeader />);
    const link = container.querySelector('a[href="/"]');
    expect(link).toBeTruthy();
    expect(link!.textContent).toContain("三国卡牌");
  });

  it("shows MAX when at max level", async () => {
    const { loadPlayer } = await import("../game/player-store");
    (loadPlayer as ReturnType<typeof vi.fn>).mockReturnValue({
      gold: 500,
      xp: 3200,
      level: 10,
      ownedCards: [],
    });

    const { container } = render(<PlayerHeader />);
    expect(container.textContent).toContain("MAX");
    expect(container.textContent).toContain("Lv.10");
  });
});
