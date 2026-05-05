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

vi.mock("../../../game/player-store", () => ({
  loadAdventureProgress: () => mockLoadProgress(),
  isStageUnlocked: (id: string, p: unknown) => mockIsUnlocked(id, p),
  completeStage: vi.fn(),
}));

vi.mock("../../../hooks/useGameState", () => ({
  useGameState: () => ({
    gameState: null, winner: null, isOpponentTurn: false,
    playCard: vi.fn(), attack: vi.fn(), attackHero: vi.fn(), endTurn: vi.fn(), useHeroPower: vi.fn(),
  }),
}));

import StagePage from "./[chapterId]/[stageId]/page";
import { adventureChapters } from "../../../game/adventure-data";

const ch1 = adventureChapters[0];

function renderStage() {
  let result: ReturnType<typeof render>;
  act(() => {
    result = render(<StagePage />);
  });
  return result!;
}

describe("Pre-battle Stage Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParams = { chapterId: "ch1", stageId: "ch1-1" };
    mockLoadProgress.mockReturnValue({ stages: {}, chaptersUnlocked: ["ch1"] });
    mockIsUnlocked.mockReturnValue(true);
  });

  it("renders stage name and chapter name", () => {
    renderStage();
    expect(screen.getByText(ch1.name)).toBeInTheDocument();
    expect(screen.getByText(ch1.stages[0].name)).toBeInTheDocument();
  });

  it("displays stage description", () => {
    renderStage();
    expect(screen.getByText(ch1.stages[0].description)).toBeInTheDocument();
  });

  it("shows enemy deck preview", () => {
    renderStage();
    expect(screen.getByText("敌方卡组预览")).toBeInTheDocument();
    const uniqueNames = [...new Set(ch1.stages[0].enemyDeck)];
    for (const name of uniqueNames) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("shows reward preview", () => {
    renderStage();
    expect(screen.getByText("通关奖励")).toBeInTheDocument();
  });

  it("shows star rating criteria", () => {
    renderStage();
    expect(screen.getByText("星级评价标准")).toBeInTheDocument();
    expect(screen.getByText(/通关即可/)).toBeInTheDocument();
  });

  it("has a Start Battle button", () => {
    renderStage();
    expect(screen.getByText(/开始战斗/)).toBeInTheDocument();
  });

  it("has a back link to /adventure", () => {
    renderStage();
    const backLink = screen.getByText("← 返回");
    expect(backLink.closest("a")).toHaveAttribute("href", "/adventure");
  });

  it("clicking Start Battle shows deck picker", () => {
    renderStage();
    act(() => {
      fireEvent.click(screen.getByText(/开始战斗/));
    });
    expect(screen.getByText("选择卡组")).toBeInTheDocument();
    expect(screen.getByText(/随机卡组/)).toBeInTheDocument();
  });

  it("redirects when stage is locked", () => {
    mockIsUnlocked.mockReturnValue(false);
    renderStage();
    expect(replaceMock).toHaveBeenCalledWith("/adventure");
  });

  it("redirects when stage not found", () => {
    mockParams = { chapterId: "nonexistent", stageId: "nope" };
    renderStage();
    expect(replaceMock).toHaveBeenCalledWith("/adventure");
  });

  it("shows difficulty stars", () => {
    renderStage();
    const diffText = screen.getByText(/难度/);
    expect(diffText.textContent).toContain("⭐");
  });

  it("shows boss rules for boss stages", () => {
    const boss = ch1.stages.find((s) => s.isBoss)!;
    if (!boss?.bossRules) return;
    mockParams = { chapterId: ch1.id, stageId: boss.id };
    renderStage();
    expect(screen.getByText("BOSS 特殊规则")).toBeInTheDocument();
    expect(screen.getAllByText("👹").length).toBeGreaterThan(0);
  });
});
