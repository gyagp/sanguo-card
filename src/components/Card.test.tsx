import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Card from "./Card";
import type { Card as CardData } from "../game/types";

function makeCard(overrides: Partial<CardData> = {}): CardData {
  return {
    name: "Zhao Yun",
    cost: 3,
    attack: 4,
    health: 2,
    description: "Charge into battle",
    rarity: "rare",
    type: "minion",
    faction: "shu",
    ...overrides,
  };
}

describe("Card component", () => {
  describe("exists and renders", () => {
    it("renders without crashing", () => {
      render(<Card card={makeCard()} />);
    });
  });

  describe("mana cost crystal in top-left", () => {
    it("displays mana cost value", () => {
      render(<Card card={makeCard({ cost: 5 })} />);
      expect(screen.getByText("5")).toBeDefined();
    });

    it("displays different mana costs", () => {
      const { unmount } = render(<Card card={makeCard({ cost: 0 })} />);
      expect(screen.getByText("0")).toBeDefined();
      unmount();
      render(<Card card={makeCard({ cost: 10 })} />);
      expect(screen.getByText("10")).toBeDefined();
    });
  });

  describe("attack and health values", () => {
    it("displays attack at bottom-left and health at bottom-right for minions", () => {
      const { container } = render(<Card card={makeCard({ cost: 1, attack: 7, health: 9 })} />);
      const yellowCircle = container.querySelector("[class*='bg-yellow-600']");
      const redCircle = container.querySelector("[class*='bg-red-600']");
      expect(yellowCircle).not.toBeNull();
      expect(yellowCircle!.textContent).toBe("7");
      expect(redCircle).not.toBeNull();
      expect(redCircle!.textContent).toBe("9");
    });

    it("displays attack and durability for weapons", () => {
      const { container } = render(<Card card={makeCard({ type: "weapon", cost: 1, attack: 5, health: 8 })} />);
      const yellowCircle = container.querySelector("[class*='bg-yellow-600']");
      const grayCircle = container.querySelector("[class*='bg-gray-600']");
      expect(yellowCircle).not.toBeNull();
      expect(yellowCircle!.textContent).toBe("5");
      expect(grayCircle).not.toBeNull();
      expect(grayCircle!.textContent).toBe("8");
    });

    it("does NOT display attack/health for spells", () => {
      const { container } = render(<Card card={makeCard({ type: "spell", attack: 0, health: 0 })} />);
      const yellowCircle = container.querySelector("[class*='bg-yellow-600']");
      expect(yellowCircle).toBeNull();
    });
  });

  describe("name and description", () => {
    it("displays card name", () => {
      render(<Card card={makeCard({ name: "Guan Yu" })} />);
      expect(screen.getByText("Guan Yu")).toBeDefined();
    });

    it("displays card description", () => {
      render(<Card card={makeCard({ description: "Divine warrior" })} />);
      expect(screen.getByText("Divine warrior")).toBeDefined();
    });
  });

  describe("rarity frame colors", () => {
    it.each([
      ["common", "border-gray-400"],
      ["rare", "border-blue-500"],
      ["epic", "border-purple-500"],
      ["legendary", "border-orange-500"],
    ] as const)("applies %s rarity border class", (rarity, expectedClass) => {
      const { container } = render(<Card card={makeCard({ rarity })} />);
      const cardEl = container.firstElementChild!;
      expect(cardEl.className).toContain(expectedClass);
    });
  });

  describe("faction background colors", () => {
    it.each([
      ["wei", "bg-blue-900"],
      ["shu", "bg-green-900"],
      ["wu", "bg-red-900"],
      ["qun", "bg-yellow-900"],
      ["neutral", "bg-gray-800"],
    ] as const)("applies %s faction background class", (faction, expectedClass) => {
      const { container } = render(<Card card={makeCard({ faction })} />);
      const cardEl = container.firstElementChild!;
      expect(cardEl.className).toContain(expectedClass);
    });
  });

  describe("card type visual treatment", () => {
    it("shows minion art area with emerald background", () => {
      const { container } = render(<Card card={makeCard({ type: "minion" })} />);
      const artArea = container.querySelector("[class*='bg-emerald']");
      expect(artArea).not.toBeNull();
    });

    it("shows spell art area with indigo background", () => {
      const { container } = render(<Card card={makeCard({ type: "spell" })} />);
      const artArea = container.querySelector("[class*='bg-indigo']");
      expect(artArea).not.toBeNull();
    });

    it("shows weapon art area with amber background", () => {
      const { container } = render(<Card card={makeCard({ type: "weapon" })} />);
      const artArea = container.querySelector("[class*='bg-amber']");
      expect(artArea).not.toBeNull();
    });

    it("shows different type icons", () => {
      const { container: c1 } = render(<Card card={makeCard({ type: "minion" })} />);
      const { container: c2 } = render(<Card card={makeCard({ type: "spell" })} />);
      const { container: c3 } = render(<Card card={makeCard({ type: "weapon" })} />);
      expect(c1.textContent).toContain("⚔️");
      expect(c2.textContent).toContain("✨");
      expect(c3.textContent).toContain("🗡️");
    });

    it("weapon health circle uses gray instead of red", () => {
      const { container } = render(<Card card={makeCard({ type: "weapon" })} />);
      const grayCircle = container.querySelector("[class*='bg-gray-600']");
      expect(grayCircle).not.toBeNull();
    });
  });

  describe("hover animation classes", () => {
    it("has scale hover class for enlarge effect", () => {
      const { container } = render(<Card card={makeCard()} />);
      const cardEl = container.firstElementChild!;
      expect(cardEl.className).toContain("hover:scale-110");
    });

    it("has glow hover class for shadow effect", () => {
      const { container } = render(<Card card={makeCard({ rarity: "rare" })} />);
      const cardEl = container.firstElementChild!;
      expect(cardEl.className).toContain("hover:shadow-blue-500/60");
    });

    it("has transition classes for smooth animation", () => {
      const { container } = render(<Card card={makeCard()} />);
      const cardEl = container.firstElementChild!;
      expect(cardEl.className).toContain("transition-all");
    });
  });
});
