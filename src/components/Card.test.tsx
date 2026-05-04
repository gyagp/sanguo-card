import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    it("shows minion art area with faction-specific background", () => {
      const { container } = render(<Card card={makeCard({ type: "minion", faction: "shu" })} />);
      const artArea = container.querySelector("[class*='bg-green-800']");
      expect(artArea).not.toBeNull();
    });

    it("shows spell art area with faction-specific background", () => {
      const { container } = render(<Card card={makeCard({ type: "spell", faction: "wei" })} />);
      const artArea = container.querySelector("[class*='bg-blue-800']");
      expect(artArea).not.toBeNull();
    });

    it("shows weapon art area with faction-specific background", () => {
      const { container } = render(<Card card={makeCard({ type: "weapon", faction: "qun" })} />);
      const artArea = container.querySelector("[class*='bg-amber-800']");
      expect(artArea).not.toBeNull();
    });

    it("shows different type icons when PNG fails to load", () => {
      const { container: c1 } = render(<Card card={makeCard({ type: "minion" })} />);
      const { container: c2 } = render(<Card card={makeCard({ type: "spell" })} />);
      const { container: c3 } = render(<Card card={makeCard({ type: "weapon" })} />);
      // Trigger PNG load failure to reveal emoji fallbacks
      c1.querySelectorAll("img").forEach(img => fireEvent.error(img));
      c2.querySelectorAll("img").forEach(img => fireEvent.error(img));
      c3.querySelectorAll("img").forEach(img => fireEvent.error(img));
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

  describe("drag-and-drop support", () => {
    it("sets draggable attribute when draggable prop is true and mana is sufficient", () => {
      const { container } = render(<Card card={makeCard()} draggable handIndex={0} />);
      const cardEl = container.firstElementChild as HTMLElement;
      expect(cardEl.getAttribute("draggable")).toBe("true");
    });

    it("is not draggable when insufficientMana is true", () => {
      const { container } = render(<Card card={makeCard()} draggable handIndex={0} insufficientMana />);
      const cardEl = container.firstElementChild as HTMLElement;
      expect(cardEl.getAttribute("draggable")).toBe("false");
    });

    it("is not draggable when draggable prop is not passed", () => {
      const { container } = render(<Card card={makeCard()} />);
      const cardEl = container.firstElementChild as HTMLElement;
      expect(cardEl.draggable).toBe(false);
    });

    it("shows opacity and cursor-not-allowed when insufficientMana", () => {
      const { container } = render(<Card card={makeCard()} insufficientMana />);
      const cardEl = container.firstElementChild as HTMLElement;
      expect(cardEl.className).toContain("opacity-50");
      expect(cardEl.className).toContain("cursor-not-allowed");
    });

    it("does not show disabled styles when mana is sufficient", () => {
      const { container } = render(<Card card={makeCard()} />);
      const cardEl = container.firstElementChild as HTMLElement;
      expect(cardEl.className).not.toContain("opacity-50");
      expect(cardEl.className).not.toContain("cursor-not-allowed");
    });
  });

  describe("legendary card gold glow and particle animations", () => {
    it("applies legendaryCardGlow animation on the card element", () => {
      const { container } = render(<Card card={makeCard({ rarity: "legendary" })} />);
      const cardEl = container.firstElementChild as HTMLElement;
      expect(cardEl.style.animation).toContain("legendaryCardGlow");
    });

    it("does NOT apply legendaryCardGlow animation on non-legendary cards", () => {
      const { container } = render(<Card card={makeCard({ rarity: "rare" })} />);
      const cardEl = container.firstElementChild as HTMLElement;
      expect(cardEl.style.animation).toBeFalsy();
    });

    it("renders animated border glow overlay for legendary cards", () => {
      const { container } = render(<Card card={makeCard({ rarity: "legendary" })} />);
      const borderGlow = container.querySelector("[style*='legendaryBorderGlow']");
      expect(borderGlow).not.toBeNull();
    });

    it("renders shimmer sweep overlay for legendary cards", () => {
      const { container } = render(<Card card={makeCard({ rarity: "legendary" })} />);
      const shimmer = container.querySelector("[style*='legendaryCardShimmer']");
      expect(shimmer).not.toBeNull();
    });

    it("renders 6 floating gold particles for legendary cards", () => {
      const { container } = render(<Card card={makeCard({ rarity: "legendary" })} />);
      const particles = container.querySelectorAll("[style*='legendaryFloat']");
      expect(particles.length).toBe(6);
    });

    it("does NOT render glow/shimmer/particles for non-legendary cards", () => {
      const { container } = render(<Card card={makeCard({ rarity: "epic" })} />);
      expect(container.querySelector("[style*='legendaryBorderGlow']")).toBeNull();
      expect(container.querySelector("[style*='legendaryCardShimmer']")).toBeNull();
      expect(container.querySelectorAll("[style*='legendaryFloat']").length).toBe(0);
    });

    it("particles use CSS keyframe animations, not setTimeout/setInterval", () => {
      const { container } = render(<Card card={makeCard({ rarity: "legendary" })} />);
      const particles = container.querySelectorAll("[style*='legendaryFloat']");
      particles.forEach((p) => {
        const style = (p as HTMLElement).style.animation;
        expect(style).toContain("legendaryFloat");
      });
    });

    it("particles have staggered animation delays", () => {
      const { container } = render(<Card card={makeCard({ rarity: "legendary" })} />);
      const particles = container.querySelectorAll("[style*='legendaryFloat']");
      const delays = Array.from(particles).map((p) => (p as HTMLElement).style.animation);
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });

    it("particles have radial-gradient gold background", () => {
      const { container } = render(<Card card={makeCard({ rarity: "legendary" })} />);
      const particles = container.querySelectorAll("[style*='legendaryFloat']");
      particles.forEach((p) => {
        expect((p as HTMLElement).style.background).toContain("radial-gradient");
      });
    });
  });

  describe("PNG card art loading", () => {
    it("renders an img tag with src pointing to /card-art/[cardName].png", () => {
      const { container } = render(<Card card={makeCard({ name: "Zhao Yun" })} />);
      const img = container.querySelector("img") as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.src).toContain("/card-art/Zhao%20Yun.png");
    });

    it("uses object-fit: cover on the card art image", () => {
      const { container } = render(<Card card={makeCard()} />);
      const img = container.querySelector("img") as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.className).toContain("object-cover");
    });

    it("falls back to SVG art when PNG fails to load", () => {
      const { container } = render(<Card card={makeCard({ name: "Zhao Yun" })} />);
      const img = container.querySelector("img") as HTMLImageElement;
      expect(img).not.toBeNull();
      fireEvent.error(img);
      // After error, img should be gone (replaced by SVG or emoji fallback)
      const imgAfter = container.querySelector("img");
      expect(imgAfter).toBeNull();
    });

    it("card art area occupies at least 40% of card height via h-28 on h-64 card", () => {
      // h-28 = 7rem, h-64 = 16rem. 7/16 = 43.75% > 40%
      const { container } = render(<Card card={makeCard()} />);
      const artArea = container.querySelector("[class*='h-28']");
      expect(artArea).not.toBeNull();
    });

    it("image fills the full art area width and height", () => {
      const { container } = render(<Card card={makeCard()} />);
      const img = container.querySelector("img") as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.className).toContain("w-full");
      expect(img.className).toContain("h-full");
    });

    it("art area has overflow-hidden to prevent layout shift", () => {
      const { container } = render(<Card card={makeCard()} />);
      const artArea = container.querySelector("[class*='h-28']");
      expect(artArea).not.toBeNull();
      expect(artArea!.className).toContain("overflow-hidden");
    });

    it("encodes card names with special characters in the PNG URL", () => {
      const { container } = render(<Card card={makeCard({ name: "曹操" })} />);
      const img = container.querySelector("img") as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.src).toContain("/card-art/%E6%9B%B9%E6%93%8D.png");
    });

    it("sets draggable=false on the art image to prevent ghost drag", () => {
      const { container } = render(<Card card={makeCard()} />);
      const img = container.querySelector("img") as HTMLImageElement;
      expect(img).not.toBeNull();
      expect(img.draggable).toBe(false);
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
