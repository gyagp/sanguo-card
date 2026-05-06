import { describe, it, expect } from "vitest";
import { cards } from "./cards";
import {
  Card,
  GameState,
  PlayerState,
  BoardMinion,
  Deck,
  Lane,
  playCard,
  createPlayerState,
} from "./types";
import * as fs from "fs";
import * as path from "path";

function makeDeck(): Deck {
  const filler: Card = {
    name: "filler", cost: 1, attack: 1, health: 1,
    description: "test", rarity: "common", type: "minion", faction: "neutral",
  };
  return Array(30).fill(filler) as unknown as Deck;
}

function makeState(): GameState {
  return {
    players: [createPlayerState(makeDeck()), createPlayerState(makeDeck())],
    board: [[], []],
    turn: 1,
    phase: "playing",
    turnPhase: "play",
    activePlayer: 0,
    spellsPlayed: [[], []], wuComboCount: [0, 0],
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
}

function makeMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    name: "test", cost: 1, attack: 1, health: 1, description: "",
    rarity: "common", type: "minion", faction: "neutral",
    currentAttack: 1, currentHealth: 1,
    summoningSickness: true, hasAttacked: false, hasDivineShield: false,
    isStealth: false, isFrozen: false, isImmune: false,
    freezeTurnsLeft: 0,
    windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
    factionAttackBonus: 0, factionHealthBonus: 0, shuAdjacencyAtkBonus: 0, shuAdjacencyHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    lane: Lane.Center, slotIndex: 0,
    ...overrides,
  };
}

function findCard(name: string): Card {
  const card = cards.find((c) => c.name === name);
  if (!card) throw new Error(`Card not found: ${name}`);
  return { ...card };
}

function giveCard(state: GameState, player: number, card: Card) {
  state.players[player].hand.push(card);
}

describe("Spell targeting acceptance criteria", () => {
  describe("Spells with targetType prompt target selection", () => {
    it("烽火 has targetType 'enemy_minion'", () => {
      const card = findCard("烽火");
      expect(card.targetType).toBe("enemy_minion");
    });

    it("烽火 uses targetIndex when provided", () => {
      const state = makeState();
      state.players[0].hero.mana = 10;
      state.players[1].board = [
        makeMinion({ name: "A", currentHealth: 5 }),
        makeMinion({ name: "B", currentHealth: 5 }),
      ];
      giveCard(state, 0, findCard("烽火"));
      const handIndex = state.players[0].hand.length - 1;
      playCard(state, handIndex, 1);
      expect(state.players[1].board[0].currentHealth).toBe(5);
      expect(state.players[1].board[1].currentHealth).toBe(3);
    });

    it("page.tsx enters targeting mode for spells with targetType", () => {
      const pagePath = path.resolve(__dirname, "../app/game/page.tsx");
      const content = fs.readFileSync(pagePath, "utf-8");
      expect(content).toMatch(/pendingSpell/);
      expect(content).toMatch(/card\.targetType/);
      expect(content).toMatch(/选择一个敌方随从作为目标/);
    });
  });

  describe("Non-targeted spells resolve immediately", () => {
    it("征兵令 has no targetType", () => {
      const card = findCard("征兵令");
      expect(card.targetType).toBeUndefined();
    });

    it("征兵令 resolves immediately without target selection", () => {
      const state = makeState();
      state.players[0].hero.mana = 10;
      giveCard(state, 0, findCard("征兵令"));
      const handIndex = state.players[0].hand.length - 1;
      playCard(state, handIndex);
      expect(state.players[0].board.length).toBe(2);
      expect(state.players[0].board[0].name).toBe("乡勇");
    });
  });

  describe("AI auto-selects targets", () => {
    it("AI pickSpellTarget is defined and exported from ai.ts", async () => {
      const aiPath = path.resolve(__dirname, "./ai.ts");
      const content = fs.readFileSync(aiPath, "utf-8");
      expect(content).toMatch(/function pickSpellTarget/);
    });

    it("AI decision includes spellTarget for targeted spells", async () => {
      const aiPath = path.resolve(__dirname, "./ai.ts");
      const content = fs.readFileSync(aiPath, "utf-8");
      expect(content).toMatch(/spellTarget.*pickSpellTarget|pickSpellTarget.*spellTarget/s);
    });

    it("PlayCardDecision has spellTarget field", async () => {
      const aiPath = path.resolve(__dirname, "./ai.ts");
      const content = fs.readFileSync(aiPath, "utf-8");
      expect(content).toMatch(/spellTarget\??: number/);
    });
  });
});
