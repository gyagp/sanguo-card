import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import CardsPage from "./page";
import { cards } from "../../game/cards";

afterEach(cleanup);

describe("Card Gallery page acceptance criteria", () => {
  it("renders the gallery page", () => {
    render(<CardsPage />);
    expect(screen.getByText("卡牌图鉴")).toBeInTheDocument();
  });

  it("displays all cards by default", () => {
    render(<CardsPage />);
    expect(
      screen.getByText(`共 ${cards.length} / ${cards.length} 张卡牌`)
    ).toBeInTheDocument();
  });

  describe("shows cards across all rarities", () => {
    const rarities = ["common", "rare", "epic", "legendary"] as const;
    const rarityLabels: Record<string, string> = {
      common: "普通",
      rare: "稀有",
      epic: "史诗",
      legendary: "传说",
    };

    for (const rarity of rarities) {
      it(`has at least one ${rarity} card in the data`, () => {
        expect(cards.some((c) => c.rarity === rarity)).toBe(true);
      });
    }

    it("renders rarity filter buttons", () => {
      render(<CardsPage />);
      for (const r of rarities) {
        expect(
          screen.getByRole("button", { name: rarityLabels[r] })
        ).toBeInTheDocument();
      }
    });
  });

  describe("shows cards across all factions", () => {
    const factionLabels: Record<string, string> = {
      wei: "魏",
      shu: "蜀",
      wu: "吴",
      qun: "群",
      neutral: "中立",
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
    const typeLabels: Record<string, string> = {
      minion: "随从",
      spell: "法术",
      weapon: "武器",
    };

    for (const type of types) {
      it(`has at least one ${type} card in the data`, () => {
        expect(cards.some((c) => c.type === type)).toBe(true);
      });
    }

    it("renders type filter buttons", () => {
      render(<CardsPage />);
      for (const t of types) {
        expect(
          screen.getByRole("button", { name: typeLabels[t] })
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
      fireEvent.click(screen.getByRole("button", { name: "传说" }));
      expect(
        screen.getByText(`共 ${legendaryCount} / ${cards.length} 张卡牌`)
      ).toBeInTheDocument();
    });

    it("filters by faction", () => {
      render(<CardsPage />);
      const shuCount = cards.filter((c) => c.faction === "shu").length;
      fireEvent.click(screen.getByRole("button", { name: "蜀" }));
      expect(
        screen.getByText(`共 ${shuCount} / ${cards.length} 张卡牌`)
      ).toBeInTheDocument();
    });

    it("shows empty state when no cards match", () => {
      render(<CardsPage />);
      fireEvent.click(screen.getByRole("button", { name: "传说" }));
      fireEvent.click(screen.getByRole("button", { name: "武器" }));
      const count = cards.filter(
        (c) => c.rarity === "legendary" && c.type === "weapon"
      ).length;
      if (count === 0) {
        expect(
          screen.getByText("没有符合条件的卡牌")
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
