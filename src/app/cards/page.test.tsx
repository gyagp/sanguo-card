import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import CardsPage from "./page";
import { cards } from "../../game/cards";

afterEach(cleanup);

describe("Card Gallery page acceptance criteria", () => {
  it("renders the gallery page", () => {
    render(<CardsPage />);
    expect(screen.getByText("Card Gallery")).toBeInTheDocument();
  });

  it("displays all cards by default", () => {
    render(<CardsPage />);
    expect(
      screen.getByText(`${cards.length} of ${cards.length} cards`)
    ).toBeInTheDocument();
  });

  describe("shows cards across all rarities", () => {
    const rarities = ["common", "rare", "epic", "legendary"] as const;
    for (const rarity of rarities) {
      it(`has at least one ${rarity} card in the data`, () => {
        expect(cards.some((c) => c.rarity === rarity)).toBe(true);
      });
    }

    it("renders rarity filter buttons", () => {
      render(<CardsPage />);
      for (const r of rarities) {
        expect(
          screen.getByRole("button", {
            name: r.charAt(0).toUpperCase() + r.slice(1),
          })
        ).toBeInTheDocument();
      }
    });
  });

  describe("shows cards across all factions", () => {
    const factionLabels: Record<string, string> = {
      wei: "魏 Wei",
      shu: "蜀 Shu",
      wu: "吴 Wu",
      qun: "群 Qun",
      neutral: "中立 Neutral",
    };

    for (const [faction] of Object.entries(factionLabels)) {
      it(`has at least one ${faction} card in the data`, () => {
        expect(cards.some((c) => c.faction === faction)).toBe(true);
      });
    }

    it("renders all faction filter buttons", () => {
      render(<CardsPage />);
      for (const label of Object.values(factionLabels)) {
        expect(
          screen.getByRole("button", { name: label })
        ).toBeInTheDocument();
      }
    });
  });

  describe("shows cards across all types", () => {
    const types = ["minion", "spell", "weapon"] as const;
    for (const type of types) {
      it(`has at least one ${type} card in the data`, () => {
        expect(cards.some((c) => c.type === type)).toBe(true);
      });
    }

    it("renders type filter buttons", () => {
      render(<CardsPage />);
      for (const t of types) {
        expect(
          screen.getByRole("button", {
            name: t.charAt(0).toUpperCase() + t.slice(1),
          })
        ).toBeInTheDocument();
      }
    });
  });

  describe("filtering works", () => {
    it("filters by rarity", () => {
      render(<CardsPage />);
      const legendaryCount = cards.filter(
        (c) => c.rarity === "legendary"
      ).length;
      fireEvent.click(screen.getByRole("button", { name: "Legendary" }));
      expect(
        screen.getByText(`${legendaryCount} of ${cards.length} cards`)
      ).toBeInTheDocument();
    });

    it("filters by faction", () => {
      render(<CardsPage />);
      const shuCount = cards.filter((c) => c.faction === "shu").length;
      fireEvent.click(screen.getByRole("button", { name: "蜀 Shu" }));
      expect(
        screen.getByText(`${shuCount} of ${cards.length} cards`)
      ).toBeInTheDocument();
    });

    it("shows empty state when no cards match", () => {
      render(<CardsPage />);
      fireEvent.click(screen.getByRole("button", { name: "Legendary" }));
      fireEvent.click(screen.getByRole("button", { name: "Weapon" }));
      const count = cards.filter(
        (c) => c.rarity === "legendary" && c.type === "weapon"
      ).length;
      if (count === 0) {
        expect(
          screen.getByText("No cards match the selected filters.")
        ).toBeInTheDocument();
      }
    });
  });

  describe("cards are interactive with hover animations", () => {
    it("Card component has hover scale and transition classes", () => {
      render(<CardsPage />);
      const cardElements = document.querySelectorAll(".hover\\:scale-110");
      expect(cardElements.length).toBeGreaterThan(0);
    });

    it("Card component has transition-all for smooth animation", () => {
      render(<CardsPage />);
      const transitionElements =
        document.querySelectorAll(".transition-all");
      expect(transitionElements.length).toBeGreaterThan(0);
    });
  });
});
