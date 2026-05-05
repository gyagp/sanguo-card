import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { AdventureProgress } from "../../game/player-store";
import { adventureChapters } from "../../game/adventure-data";

const mockLoadProgress = vi.fn<() => AdventureProgress>();
const mockIsUnlocked = vi.fn<(id: string, p?: AdventureProgress) => boolean>();

vi.mock("../../game/player-store", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../../game/player-store")>();
  return {
    ...orig,
    loadAdventureProgress: (...args: unknown[]) => mockLoadProgress(),
    isStageUnlocked: (id: string, p?: AdventureProgress) => mockIsUnlocked(id, p),
  };
});

import AdventurePage from "./page";

function makeProgress(overrides: Partial<AdventureProgress> = {}): AdventureProgress {
  return {
    stages: {},
    chaptersUnlocked: [adventureChapters[0].id],
    ...overrides,
  };
}

describe("AdventurePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushMock.mockReset();
  });

  it("renders chapter tabs and stage grid", () => {
    const progress = makeProgress();
    mockLoadProgress.mockReturnValue(progress);
    mockIsUnlocked.mockReturnValue(true);

    render(<AdventurePage />);

    expect(screen.getByText("冒险模式")).toBeInTheDocument();
    expect(screen.getByText(adventureChapters[0].name)).toBeInTheDocument();

    const ch1 = adventureChapters[0];
    for (const stage of ch1.stages) {
      expect(screen.getByText(stage.name)).toBeInTheDocument();
    }
  });

  it("shows lock icon for locked stages", () => {
    const progress = makeProgress();
    mockLoadProgress.mockReturnValue(progress);
    mockIsUnlocked.mockImplementation((id) => id === adventureChapters[0].stages[0].id);

    render(<AdventurePage />);

    const lockIcons = screen.getAllByText("🔒");
    expect(lockIcons.length).toBeGreaterThan(0);
  });

  it("shows 1-3 stars for cleared stages", () => {
    const ch1 = adventureChapters[0];
    const progress = makeProgress({
      stages: {
        [ch1.stages[0].id]: { completed: true, stars: 3 },
        [ch1.stages[1].id]: { completed: true, stars: 1 },
      },
    });
    mockLoadProgress.mockReturnValue(progress);
    mockIsUnlocked.mockReturnValue(true);

    render(<AdventurePage />);

    const stars = screen.getAllByText("★");
    expect(stars.length).toBeGreaterThan(0);

    const yellowStars = stars.filter((el) => el.className.includes("text-yellow-400"));
    expect(yellowStars.length).toBeGreaterThan(0);
  });

  it("boss stages are visually distinct", () => {
    const progress = makeProgress();
    mockLoadProgress.mockReturnValue(progress);
    mockIsUnlocked.mockReturnValue(true);

    render(<AdventurePage />);

    const bossIcons = screen.queryAllByText("👹");
    const ch1 = adventureChapters[0];
    const bossCount = ch1.stages.filter((s) => s.isBoss).length;
    expect(bossIcons.length).toBe(bossCount);

    if (bossCount > 0) {
      const bossStage = ch1.stages.find((s) => s.isBoss)!;
      const bossLabel = screen.getByText(bossStage.name);
      expect(bossLabel.className).toContain("text-red-300");
    }
  });

  it("clicking unlocked stage navigates to pre-battle screen", () => {
    const ch1 = adventureChapters[0];
    const progress = makeProgress();
    mockLoadProgress.mockReturnValue(progress);
    mockIsUnlocked.mockReturnValue(true);

    render(<AdventurePage />);

    const stageButton = screen.getByText(ch1.stages[0].name).closest("button")!;
    fireEvent.click(stageButton);

    expect(pushMock).toHaveBeenCalledWith(`/adventure/${ch1.stages[0].id}`);
  });

  it("locked stages are not clickable (no button)", () => {
    const ch1 = adventureChapters[0];
    const progress = makeProgress();
    mockLoadProgress.mockReturnValue(progress);
    mockIsUnlocked.mockImplementation((id) => id === ch1.stages[0].id);

    render(<AdventurePage />);

    const lockedStage = ch1.stages.find((s) => s.id !== ch1.stages[0].id)!;
    const lockedEl = screen.getByText(lockedStage.name);
    expect(lockedEl.closest("button")).toBeNull();
  });

  it("locked chapters show lock prefix and are disabled", () => {
    const progress = makeProgress({ chaptersUnlocked: [adventureChapters[0].id] });
    mockLoadProgress.mockReturnValue(progress);
    mockIsUnlocked.mockReturnValue(true);

    render(<AdventurePage />);

    if (adventureChapters.length > 1) {
      const lockedChapter = adventureChapters[1];
      const tab = screen.getByText(`🔒 ${lockedChapter.name}`);
      expect(tab).toBeDisabled();
    }
  });

  it("uncompleted unlocked stages show 未通关", () => {
    const progress = makeProgress();
    mockLoadProgress.mockReturnValue(progress);
    mockIsUnlocked.mockReturnValue(true);

    render(<AdventurePage />);

    const labels = screen.getAllByText("未通关");
    expect(labels.length).toBeGreaterThan(0);
  });
});

describe("Main menu Adventure link", () => {
  it("main menu has Adventure (冒险模式) link", async () => {
    vi.resetModules();
    vi.doMock("../game/player-store", () => ({
      loadPlayer: () => ({ gold: 100, xp: 0, level: 1, ownedCards: [] }),
    }));
    vi.doMock("../game/progression", () => ({
      XP_THRESHOLDS: [0, 100],
      getXPProgress: () => ({ current: 0, needed: 100, percent: 0 }),
      LEVEL_UNLOCKS: {},
    }));
    const { default: Home } = await import("../page");
    render(<Home />);
    const link = screen.getByText("冒险模式");
    expect(link.closest("a")).toHaveAttribute("href", "/adventure");
  });
});
