import { describe, it, expect, beforeEach } from "vitest";
import {
  Card,
  Deck,
  GameState,
  BoardMinion,
  createDeck,
  initializeGame,
  startTurn,
  endTurn,
  heroAttack,
  checkWinCondition,
  gameEventBus,
  WEAPON_ON_ATTACK_HOOKS,
} from "./types";

function makeCard(overrides: Partial<Card> = {}): Card {
  return {
    name: "Test Card",
    cost: 1,
    attack: 2,
    health: 3,
    description: "",
    rarity: "common",
    type: "minion",
    faction: "neutral",
    ...overrides,
  };
}

function makeDeck(): Deck {
  return createDeck(Array.from({ length: 30 }, (_, i) => makeCard({ name: `Card ${i}` })));
}

function makeBoardMinion(overrides: Partial<BoardMinion> = {}): BoardMinion {
  return {
    ...makeCard({ type: "minion" }),
    currentAttack: 2,
    currentHealth: 3,
    summoningSickness: false,
    hasAttacked: false,
    hasDivineShield: false,
    isStealth: false,
    isFrozen: false,
    freezeTurnsLeft: 0,
    isImmune: false,
    windfuryAttacksLeft: 1,
    enrageActive: false,
    enrageBonus: 0, factionAttackBonus: 0, factionHealthBonus: 0, formationAtkBonus: 0, formationHpBonus: 0, brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0, wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    ...overrides,
  };
}

function setupWithWeapon(weaponAttack = 3, weaponDurability = 2): GameState {
  const state = initializeGame(makeDeck(), makeDeck());
  state.players[0].weapon = { name: "Test Weapon", attack: weaponAttack, durability: weaponDurability };
  state.players[0].heroWindfuryAttacksLeft = 1;
  return state;
}

beforeEach(() => {
  gameEventBus.clear();
});

describe("heroAttack", () => {
  describe("basic hero-to-hero attack", () => {
    it("deals weapon damage to enemy hero", () => {
      const state = setupWithWeapon(3, 2);
      const result = heroAttack(state, 1);
      expect(result.success).toBe(true);
      expect(state.players[1].hero.health).toBe(27); // 30 - 3
    });

    it("decrements weapon durability by 1", () => {
      const state = setupWithWeapon(3, 2);
      heroAttack(state, 1);
      expect(state.players[0].weapon).not.toBeNull();
      expect(state.players[0].weapon!.durability).toBe(1);
    });

    it("removes weapon when durability reaches 0", () => {
      const state = setupWithWeapon(3, 1);
      heroAttack(state, 1);
      expect(state.players[0].weapon).toBeNull();
    });

    it("sets game to ended when enemy hero dies", () => {
      const state = setupWithWeapon(30, 1);
      heroAttack(state, 1);
      expect(state.players[1].hero.health).toBe(0);
      expect(state.phase).toBe("ended");
      expect(checkWinCondition(state)).toBe(0);
    });
  });

  describe("hero attacks minion", () => {
    it("deals weapon damage to target minion", () => {
      const state = setupWithWeapon(3, 2);
      state.players[1].board = [makeBoardMinion({ currentAttack: 2, currentHealth: 5 })];
      const result = heroAttack(state, 1, 0);
      expect(result.success).toBe(true);
      expect(state.players[1].board[0].currentHealth).toBe(2); // 5 - 3
    });

    it("hero takes damage equal to target minion attack", () => {
      const state = setupWithWeapon(3, 2);
      state.players[1].board = [makeBoardMinion({ currentAttack: 4, currentHealth: 5 })];
      heroAttack(state, 1, 0);
      expect(state.players[0].hero.health).toBe(26); // 30 - 4
    });

    it("decrements durability when attacking minion", () => {
      const state = setupWithWeapon(3, 2);
      state.players[1].board = [makeBoardMinion({ currentHealth: 5 })];
      heroAttack(state, 1, 0);
      expect(state.players[0].weapon!.durability).toBe(1);
    });

    it("removes dead minion after hero attack", () => {
      const state = setupWithWeapon(5, 2);
      state.players[1].board = [makeBoardMinion({ currentAttack: 1, currentHealth: 3 })];
      heroAttack(state, 1, 0);
      expect(state.players[1].board).toHaveLength(0);
    });

    it("hero can die from minion counterattack damage", () => {
      const state = setupWithWeapon(3, 2);
      state.players[0].hero.health = 5;
      state.players[1].board = [makeBoardMinion({ currentAttack: 10, currentHealth: 10 })];
      heroAttack(state, 1, 0);
      expect(state.players[0].hero.health).toBe(-5);
      expect(state.phase).toBe("ended");
    });
  });

  describe("taunt enforcement", () => {
    it("prevents attacking enemy hero when taunt minion exists", () => {
      const state = setupWithWeapon(3, 2);
      state.players[1].board = [makeBoardMinion({ taunt: true, currentHealth: 5 })];
      const result = heroAttack(state, 1);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/taunt/i);
    });

    it("prevents attacking non-taunt minion when taunt minion exists", () => {
      const state = setupWithWeapon(3, 2);
      state.players[1].board = [
        makeBoardMinion({ name: "NoTaunt", currentHealth: 5 }),
        makeBoardMinion({ name: "Taunt", taunt: true, currentHealth: 5 }),
      ];
      const result = heroAttack(state, 1, 0);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/taunt/i);
    });

    it("allows attacking taunt minion directly", () => {
      const state = setupWithWeapon(3, 2);
      state.players[1].board = [makeBoardMinion({ taunt: true, currentHealth: 5 })];
      const result = heroAttack(state, 1, 0);
      expect(result.success).toBe(true);
    });
  });

  describe("validation", () => {
    it("fails when hero has no weapon", () => {
      const state = initializeGame(makeDeck(), makeDeck());
      const result = heroAttack(state, 1);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/no weapon/i);
    });

    it("fails when targeting own side", () => {
      const state = setupWithWeapon(3, 2);
      const result = heroAttack(state, 0);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/own side/i);
    });

    it("fails with invalid target minion index", () => {
      const state = setupWithWeapon(3, 2);
      const result = heroAttack(state, 1, 5);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/invalid/i);
    });

    it("fails when targeting stealthed minion", () => {
      const state = setupWithWeapon(3, 2);
      state.players[1].board = [makeBoardMinion({ isStealth: true })];
      const result = heroAttack(state, 1, 0);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/stealth/i);
    });
  });

  describe("per-turn attack limit", () => {
    it("hero can only attack once per turn", () => {
      const state = setupWithWeapon(3, 3);
      const result1 = heroAttack(state, 1);
      expect(result1.success).toBe(true);
      const result2 = heroAttack(state, 1);
      expect(result2.success).toBe(false);
      expect(result2.error).toMatch(/already attacked/i);
    });

    it("heroHasAttacked resets at start of turn", () => {
      const state = setupWithWeapon(3, 3);
      startTurn(state);
      heroAttack(state, 1);
      endTurn(state);
      startTurn(state);
      endTurn(state);
      startTurn(state);
      const result = heroAttack(state, 1);
      expect(result.success).toBe(true);
    });
  });

  describe("divine shield interaction", () => {
    it("removes divine shield instead of dealing damage", () => {
      const state = setupWithWeapon(3, 2);
      state.players[1].board = [makeBoardMinion({ hasDivineShield: true, currentHealth: 5 })];
      heroAttack(state, 1, 0);
      expect(state.players[1].board[0].hasDivineShield).toBe(false);
      expect(state.players[1].board[0].currentHealth).toBe(5);
    });
  });

  describe("immune hero interaction", () => {
    it("immune hero takes no counterattack damage from minion", () => {
      const state = setupWithWeapon(3, 2);
      state.players[0].hero.isImmune = true;
      state.players[1].board = [makeBoardMinion({ currentAttack: 5, currentHealth: 10 })];
      heroAttack(state, 1, 0);
      expect(state.players[0].hero.health).toBe(30);
    });

    it("immune target hero takes no damage", () => {
      const state = setupWithWeapon(3, 2);
      state.players[1].hero.isImmune = true;
      heroAttack(state, 1);
      expect(state.players[1].hero.health).toBe(30);
    });
  });

  describe("weapon durability across multiple attacks", () => {
    it("weapon with durability 3 lasts 3 attacks", () => {
      const state = setupWithWeapon(2, 3);

      heroAttack(state, 1);
      expect(state.players[0].weapon).not.toBeNull();
      expect(state.players[0].weapon!.durability).toBe(2);

      // Need to reset heroHasAttacked for next turn
      endTurn(state);
      startTurn(state);
      endTurn(state);
      startTurn(state);

      heroAttack(state, 1);
      expect(state.players[0].weapon).not.toBeNull();
      expect(state.players[0].weapon!.durability).toBe(1);

      endTurn(state);
      startTurn(state);
      endTurn(state);
      startTurn(state);

      heroAttack(state, 1);
      expect(state.players[0].weapon).toBeNull();
    });
  });

  describe("draw condition", () => {
    it("returns draw when both heroes die from hero attacking minion", () => {
      const state = setupWithWeapon(3, 1);
      state.players[0].hero.health = 5;
      state.players[1].board = [makeBoardMinion({ currentAttack: 10, currentHealth: 1 })];
      heroAttack(state, 1, 0);
      expect(state.players[0].hero.health).toBe(-5);
      expect(checkWinCondition(state)).toBe(1);
    });
  });

  describe("丈八蛇矛 splash damage", () => {
    function setupWithSnakeSpear(): GameState {
      const state = initializeGame(makeDeck(), makeDeck());
      state.players[0].weapon = { name: "丈八蛇矛", attack: 4, durability: 2 };
      state.players[0].heroWindfuryAttacksLeft = 1;
      return state;
    }

    it("deals 1 damage to adjacent minions when attacking middle target", () => {
      const state = setupWithSnakeSpear();
      state.players[1].board = [
        makeBoardMinion({ name: "Left", currentHealth: 5 }),
        makeBoardMinion({ name: "Mid", currentHealth: 5 }),
        makeBoardMinion({ name: "Right", currentHealth: 5 }),
      ];
      heroAttack(state, 1, 1);
      expect(state.players[1].board[0].currentHealth).toBe(4); // left: 5 - 1
      expect(state.players[1].board[1].currentHealth).toBe(1); // mid: 5 - 4
      expect(state.players[1].board[2].currentHealth).toBe(4); // right: 5 - 1
    });

    it("only splashes right when attacking leftmost minion", () => {
      const state = setupWithSnakeSpear();
      state.players[1].board = [
        makeBoardMinion({ name: "Left", currentHealth: 5 }),
        makeBoardMinion({ name: "Right", currentHealth: 5 }),
      ];
      heroAttack(state, 1, 0);
      expect(state.players[1].board[0].currentHealth).toBe(1); // target: 5 - 4
      expect(state.players[1].board[1].currentHealth).toBe(4); // right: 5 - 1
    });

    it("only splashes left when attacking rightmost minion", () => {
      const state = setupWithSnakeSpear();
      state.players[1].board = [
        makeBoardMinion({ name: "Left", currentHealth: 5 }),
        makeBoardMinion({ name: "Right", currentHealth: 5 }),
      ];
      heroAttack(state, 1, 1);
      expect(state.players[1].board[0].currentHealth).toBe(4); // left: 5 - 1
      expect(state.players[1].board[1].currentHealth).toBe(1); // right: 5 - 4
    });

    it("no splash when attacking a lone minion", () => {
      const state = setupWithSnakeSpear();
      state.players[1].board = [makeBoardMinion({ name: "Solo", currentHealth: 5 })];
      heroAttack(state, 1, 0);
      expect(state.players[1].board[0].currentHealth).toBe(1); // 5 - 4, no splash
    });

    it("splash fires on last durability swing (weapon destroyed)", () => {
      const state = initializeGame(makeDeck(), makeDeck());
      state.players[0].weapon = { name: "丈八蛇矛", attack: 4, durability: 1 };
      state.players[0].heroWindfuryAttacksLeft = 1;
      state.players[1].board = [
        makeBoardMinion({ name: "Left", currentHealth: 5 }),
        makeBoardMinion({ name: "Mid", currentHealth: 5 }),
        makeBoardMinion({ name: "Right", currentHealth: 5 }),
      ];
      heroAttack(state, 1, 1);
      expect(state.players[0].weapon).toBeNull();
      expect(state.players[1].board[0].currentHealth).toBe(4); // splash still fires
      expect(state.players[1].board[2].currentHealth).toBe(4);
    });

    it("splash does not hit immune adjacent minions", () => {
      const state = setupWithSnakeSpear();
      state.players[1].board = [
        makeBoardMinion({ name: "Left", currentHealth: 5, isImmune: true }),
        makeBoardMinion({ name: "Mid", currentHealth: 5 }),
        makeBoardMinion({ name: "Right", currentHealth: 5 }),
      ];
      heroAttack(state, 1, 1);
      expect(state.players[1].board[0].currentHealth).toBe(5); // immune, no splash
      expect(state.players[1].board[2].currentHealth).toBe(4); // not immune
    });

    it("no splash when attacking enemy hero", () => {
      const state = setupWithSnakeSpear();
      state.players[1].board = [makeBoardMinion({ name: "Bystander", currentHealth: 5 })];
      heroAttack(state, 1); // attack hero, not minion
      // Bystander should be untouched
      expect(state.players[1].board[0].currentHealth).toBe(5);
    });

    it("splash kills adjacent minions and they are removed", () => {
      const state = setupWithSnakeSpear();
      state.players[1].board = [
        makeBoardMinion({ name: "Left", currentHealth: 1 }),
        makeBoardMinion({ name: "Mid", currentHealth: 5 }),
        makeBoardMinion({ name: "Right", currentHealth: 1 }),
      ];
      heroAttack(state, 1, 1);
      // Left and Right should die from 1 splash damage
      expect(state.players[1].board).toHaveLength(1);
      expect(state.players[1].board[0].name).toBe("Mid");
    });

    it("splash survives JSON-based state cloning", () => {
      const state = setupWithSnakeSpear();
      const cloned: GameState = JSON.parse(JSON.stringify(state));
      cloned.players[1].board = [
        makeBoardMinion({ name: "Left", currentHealth: 5 }),
        makeBoardMinion({ name: "Mid", currentHealth: 5 }),
        makeBoardMinion({ name: "Right", currentHealth: 5 }),
      ];
      heroAttack(cloned, 1, 1);
      expect(cloned.players[1].board[0].currentHealth).toBe(4);
      expect(cloned.players[1].board[2].currentHealth).toBe(4);
    });
  });
});
