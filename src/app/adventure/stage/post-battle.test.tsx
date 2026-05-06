import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import "@testing-library/jest-dom";

const pushMock = vi.fn();
const replaceMock = vi.fn();
const routerObj = { push: pushMock, replace: replaceMock };
let mockParams: Record<string, string> = { chapterId: "ch1", stageId: "ch1-1" };

vi.mock("next/navigation", () => ({
  useRouter: () => routerObj,
  useParams: () => mockParams,
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) => <a href={href} {...props}>{children}</a>,
}));

const mockLoadProgress = vi.fn(() => ({ stages: {}, chaptersUnlocked: ["ch1"] }));
const mockIsUnlocked = vi.fn(() => true);
const mockCompleteStage = vi.fn();
const mockAddGold = vi.fn();
const mockAddXP = vi.fn();
const mockAddCards = vi.fn();

vi.mock("../../../game/player-store", () => ({
  loadAdventureProgress: () => mockLoadProgress(),
  isStageUnlocked: (id: string, p: unknown) => mockIsUnlocked(id, p),
  completeStage: (...a: unknown[]) => mockCompleteStage(...a),
  addGold: (...a: unknown[]) => mockAddGold(...a),
  addXP: (...a: unknown[]) => mockAddXP(...a),
  addCards: (...a: unknown[]) => mockAddCards(...a),
}));

let mockGameState: Record<string, unknown> | null = null;
let mockWinner: number | string | null = null;

vi.mock("../../../hooks/useGameState", () => ({
  useGameState: () => ({
    gameState: mockGameState, winner: mockWinner, isOpponentTurn: false,
    playCard: vi.fn(), attack: vi.fn(), attackHero: vi.fn(), endTurn: vi.fn(), useHeroPower: vi.fn(),
  }),
}));

vi.mock("../../../game/types", async () => {
  const actual = await vi.importActual<typeof import("../../../game/types")>("../../../game/types");
  return { ...actual, createDeck: (cards: unknown[]) => ({ cards }) };
});

import StagePage from "./[chapterId]/[stageId]/page";
import { adventureChapters } from "../../../game/adventure-data";

const ch1 = adventureChapters[0];
const stage1 = ch1.stages[0];

function makeGameState(heroHealth: number, turn: number) {
  return {
    turn,
    players: [
      { hero: { health: heroHealth, mana: 1 }, maxMana: 1, board: [], hand: [] },
      { hero: { health: 30, mana: 1 }, maxMana: 1, board: [], hand: [] },
    ],
  };
}

function renderStage() {
  let result: ReturnType<typeof render>;
  act(() => { result = render(<StagePage />); });
  return result!;
}

function enterBattle() {
  act(() => { fireEvent.click(screen.getByText(/开始战斗/)); });
  act(() => { fireEvent.click(screen.getByText(/随机卡组/)); });
}

describe("Post-battle results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { chapterId: "ch1", stageId: "ch1-1" };
    mockLoadProgress.mockReturnValue({ stages: {}, chaptersUnlocked: ["ch1"] });
    mockIsUnlocked.mockReturnValue(true);
    mockGameState = null;
    mockWinner = null;
  });

  describe("Pre-battle stage info", () => {
    it("renders stage name and star thresholds", () => {
      renderStage();
      expect(screen.getByText(stage1.name)).toBeInTheDocument();
      expect(screen.getByText(/通关即可/)).toBeInTheDocument();
    });

    it("shows rewards section", () => {
      renderStage();
      expect(screen.getByText(/通关奖励/)).toBeInTheDocument();
      if (stage1.rewards.gold) {
        expect(screen.getByText(new RegExp(`${stage1.rewards.gold} 金币`))).toBeInTheDocument();
      }
    });
  });

  describe("Victory screen — star rating", () => {
    it("shows 3 stars when HP and turns meet 3-star thresholds", () => {
      mockGameState = makeGameState(30, 1);
      mockWinner = 0;
      renderStage();
      enterBattle();

      expect(screen.getByText(/胜利/)).toBeInTheDocument();
      const stars = screen.getAllByText("⭐");
      expect(stars.length).toBe(3);
    });

    it("shows 2 stars when meeting 2-star but not 3-star thresholds", () => {
      const hpFor2 = Math.ceil(30 * stage1.starThresholds.twoStarMinHpPercent / 100);
      const turnsOver3 = stage1.starThresholds.threeStarMaxTurns + 1;

      mockGameState = makeGameState(hpFor2, turnsOver3);
      mockWinner = 0;
      renderStage();
      enterBattle();

      expect(screen.getByText(/胜利/)).toBeInTheDocument();
      const fullStars = screen.getAllByText("⭐");
      const emptyStars = screen.getAllByText("☆");
      expect(fullStars.length).toBe(2);
      expect(emptyStars.length).toBe(1);
    });

    it("shows 1 star when below 2-star thresholds", () => {
      mockGameState = makeGameState(1, 999);
      mockWinner = 0;
      renderStage();
      enterBattle();

      expect(screen.getByText(/胜利/)).toBeInTheDocument();
      const fullStars = screen.getAllByText("⭐");
      const emptyStars = screen.getAllByText("☆");
      expect(fullStars.length).toBe(1);
      expect(emptyStars.length).toBe(2);
    });
  });

  describe("Reward distribution", () => {
    it("grants gold, XP, cards on first clear", () => {
      mockLoadProgress.mockReturnValue({ stages: {}, chaptersUnlocked: ["ch1"] });
      mockGameState = makeGameState(30, 1);
      mockWinner = 0;
      renderStage();
      enterBattle();

      expect(mockCompleteStage).toHaveBeenCalledWith(stage1.id, expect.any(Number));
      if (stage1.rewards.gold) expect(mockAddGold).toHaveBeenCalledWith(stage1.rewards.gold);
      if (stage1.rewards.xp) expect(mockAddXP).toHaveBeenCalledWith(stage1.rewards.xp);
      expect(screen.getByText(/首次通关奖励/)).toBeInTheDocument();
    });

    it("does NOT grant rewards on repeat clear", () => {
      mockLoadProgress.mockReturnValue({
        stages: { "ch1-1": { completed: true, stars: 1 } },
        chaptersUnlocked: ["ch1"],
      });
      mockGameState = makeGameState(30, 1);
      mockWinner = 0;
      renderStage();
      enterBattle();

      expect(mockCompleteStage).toHaveBeenCalled();
      expect(mockAddGold).not.toHaveBeenCalled();
      expect(mockAddXP).not.toHaveBeenCalled();
      expect(screen.getByText(/已领取过通关奖励/)).toBeInTheDocument();
    });
  });

  describe("Progress update", () => {
    it("calls completeStage with stage id and calculated stars", () => {
      mockGameState = makeGameState(30, 1);
      mockWinner = 0;
      renderStage();
      enterBattle();

      expect(mockCompleteStage).toHaveBeenCalledWith(stage1.id, 3);
    });
  });

  describe("Defeat screen", () => {
    it("shows defeat message and retry button", () => {
      mockGameState = makeGameState(0, 5);
      mockWinner = 1;
      renderStage();
      enterBattle();

      expect(screen.getByText(/战败/)).toBeInTheDocument();
      expect(screen.getByText(/再试一次/)).toBeInTheDocument();
    });

    it("retry navigates back to stage page", () => {
      mockGameState = makeGameState(0, 5);
      mockWinner = 1;
      renderStage();
      enterBattle();

      fireEvent.click(screen.getByText(/再试一次/));
      expect(replaceMock).toHaveBeenCalledWith(`/adventure/stage/ch1/${stage1.id}`);
    });

    it("shows draw screen with appropriate text", () => {
      mockGameState = makeGameState(0, 5);
      mockWinner = "draw";
      renderStage();
      enterBattle();

      expect(screen.getByText(/握手言和/)).toBeInTheDocument();
    });

    it("does not grant rewards on defeat", () => {
      mockGameState = makeGameState(0, 5);
      mockWinner = 1;
      renderStage();
      enterBattle();

      expect(mockCompleteStage).not.toHaveBeenCalled();
      expect(mockAddGold).not.toHaveBeenCalled();
    });
  });

  describe("Navigation", () => {
    it("victory screen has return-to-map button", () => {
      mockGameState = makeGameState(30, 1);
      mockWinner = 0;
      renderStage();
      enterBattle();

      const btn = screen.getByText(/返回冒险地图/);
      fireEvent.click(btn);
      expect(pushMock).toHaveBeenCalledWith("/adventure");
    });

    it("defeat screen has return-to-map button", () => {
      mockGameState = makeGameState(0, 5);
      mockWinner = 1;
      renderStage();
      enterBattle();

      const btn = screen.getByText(/返回地图/);
      fireEvent.click(btn);
      expect(pushMock).toHaveBeenCalledWith("/adventure");
    });

    it("redirects to /adventure when stage not found", () => {
      mockParams = { chapterId: "nonexistent", stageId: "nope" };
      renderStage();
      expect(replaceMock).toHaveBeenCalledWith("/adventure");
    });

    it("redirects to /adventure when stage is locked", () => {
      mockIsUnlocked.mockReturnValue(false);
      renderStage();
      expect(replaceMock).toHaveBeenCalledWith("/adventure");
    });
  });
});
