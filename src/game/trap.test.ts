import { describe, it, expect, beforeEach } from "vitest";
import {
  GameState,
  PlayerState,
  createPlayerState,
  createDeck,
  Lane,
  playCard,
  attackMinion,
  attackHero,
  checkAndTriggerTraps,
  BoardMinion,
  ActiveTrap,
  gameEventBus,
  Card,
} from "./types";
import { cards } from "./cards";

function makeDeck(): ReturnType<typeof createDeck> {
  const allCards = cards.filter((c) => c.type === "minion");
  const deckCards: Card[] = [];
  for (let i = 0; deckCards.length < 30; i++) {
    const card = allCards[i % allCards.length];
    const count = deckCards.filter((c) => c.name === card.name).length;
    const max = card.rarity === "legendary" ? 1 : 2;
    if (count < max) {
      deckCards.push({ ...card });
    }
  }
  return createDeck(deckCards);
}

function makeTestState(): GameState {
  const state: GameState = {
    players: [createPlayerState(makeDeck()), createPlayerState(makeDeck())],
    board: [[], []],
    turn: 1,
    phase: "playing",
    turnPhase: "play",
    activePlayer: 0,
    spellsPlayed: [[], []],
    wuComboCount: [0, 0],
    terrain: { [Lane.Left]: null, [Lane.Center]: null, [Lane.Right]: null },
  };
  state.players[0].maxMana = 10;
  state.players[0].hero.mana = 10;
  state.players[1].maxMana = 10;
  state.players[1].hero.mana = 10;
  return state;
}

function makeMinion(name: string, attack: number, health: number, lane: Lane = Lane.Center): BoardMinion {
  return {
    name, cost: 1, attack, health, description: "", rarity: "common", type: "minion", faction: "neutral",
    currentAttack: attack, currentHealth: health,
    summoningSickness: false, hasAttacked: false, hasDivineShield: false,
    isStealth: false, isFrozen: false, freezeTurnsLeft: 0, isImmune: false,
    windfuryAttacksLeft: 1, enrageActive: false, enrageBonus: 0,
    factionAttackBonus: 0, factionHealthBonus: 0,
    formationAtkBonus: 0, formationHpBonus: 0,
    brotherhoodAtkBonus: 0, brotherhoodHpBonus: 0,
    wuChargeBonus: 0, wuWeaponBonus: 0, wuComboAtkBonus: 0, wuComboHpBonus: 0, qunDebuff: 0,
    lane, slotIndex: 0,
  };
}

function getTrapCard(name: string): Card {
  const card = cards.find((c) => c.name === name);
  if (!card) throw new Error(`Card not found: ${name}`);
  return { ...card };
}

beforeEach(() => {
  gameEventBus.clear();
});

describe("Trap card play", () => {
  it("deducts mana and removes card from hand when playing a trap", () => {
    const state = makeTestState();
    const trap = getTrapCard("埋伏");
    state.players[0].hand = [trap];

    const result = playCard(state, 0);

    expect(result.success).toBe(true);
    expect(state.players[0].hero.mana).toBe(10 - trap.cost);
    expect(state.players[0].hand).toHaveLength(0);
  });

  it("sets trap face-down in activeTraps", () => {
    const state = makeTestState();
    const trap = getTrapCard("反间计");
    state.players[0].hand = [trap];

    playCard(state, 0);

    expect(state.players[0].activeTraps).toHaveLength(1);
    expect(state.players[0].activeTraps[0].trigger).toBe("on_spell");
    expect(state.players[0].activeTraps[0].card.name).toBe("反间计");
  });

  it("fails when not enough mana", () => {
    const state = makeTestState();
    state.players[0].hero.mana = 0;
    const trap = getTrapCard("埋伏");
    state.players[0].hand = [trap];

    const result = playCard(state, 0);

    expect(result.success).toBe(false);
    expect(state.players[0].hand).toHaveLength(1);
    expect(state.players[0].activeTraps).toHaveLength(0);
  });

  it("returns error for trap card missing trapTrigger/trapEffect", () => {
    const state = makeTestState();
    const badTrap: Card = {
      name: "BadTrap", cost: 1, attack: 0, health: 0, description: "",
      rarity: "common", type: "trap", faction: "neutral",
    };
    state.players[0].hand = [badTrap];

    const result = playCard(state, 0);

    expect(result.success).toBe(false);
    expect(result.error).toContain("missing");
    expect(state.players[0].hero.mana).toBe(10);
  });
});

describe("Trap triggering", () => {
  it("埋伏 triggers on opponent attack and damages the attacker", () => {
    const state = makeTestState();
    // Player 1 has a trap set
    const trapCard = getTrapCard("埋伏");
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    // Player 0 has an attacker, player 1 has a defender
    const attacker = makeMinion("Attacker", 2, 5);
    state.players[0].board = [attacker];
    const defender = makeMinion("Defender", 1, 5);
    state.players[1].board = [defender];

    attackMinion(state, 0, 0);

    // Attacker should take 3 damage from trap + 1 from combat = 4 total taken from 5hp
    expect(attacker.currentHealth).toBe(5 - 1 - 3); // 1 from defender, 3 from trap
  });

  it("埋伏 targets the actual attacker, not the last minion", () => {
    const state = makeTestState();
    const trapCard = getTrapCard("埋伏");
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    const attacker = makeMinion("Attacker", 2, 10, Lane.Center);
    const bystander = makeMinion("Bystander", 1, 10, Lane.Center);
    state.players[0].board = [attacker, bystander];
    const defender = makeMinion("Defender", 1, 5, Lane.Center);
    state.players[1].board = [defender];

    attackMinion(state, 0, 0);

    expect(attacker.currentHealth).toBe(10 - 1 - 3);
    expect(bystander.currentHealth).toBe(10); // bystander untouched
  });

  it("反间计 triggers on opponent spell and damages enemy hero", () => {
    const state = makeTestState();
    state.players[0].hero.health = 25; // below cap so heal is visible
    const trapCard = getTrapCard("反间计");
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    const spell = cards.find((c) => c.name === "草药")!;
    state.players[0].hand = [{ ...spell }];

    playCard(state, 0);

    // heal +5 (25->30), then trap -4 = 26
    expect(state.players[0].hero.health).toBe(26);
  });

  it("疑兵之计 triggers on opponent minion play and debuffs the played minion", () => {
    const state = makeTestState();
    const trapCard = getTrapCard("疑兵之计");
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    const minion = cards.find((c) => c.name === "弓弩手")!;
    state.players[0].hand = [{ ...minion }];

    playCard(state, 0);

    const played = state.players[0].board.find((m) => m.name === "弓弩手");
    expect(played).toBeDefined();
    expect(played!.currentAttack).toBe(Math.max(0, minion.attack - 2));
  });

  it("trap is removed after firing", () => {
    const state = makeTestState();
    const trapCard = getTrapCard("反间计");
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    const spell = cards.find((c) => c.name === "草药")!;
    state.players[0].hand = [{ ...spell }];

    playCard(state, 0);

    expect(state.players[1].activeTraps).toHaveLength(0);
  });

  it("trap does not trigger on own player actions", () => {
    const state = makeTestState();
    const trapCard = getTrapCard("反间计");
    // Player 0 sets the trap
    state.players[0].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    // Player 0 casts a spell — their own trap should NOT fire
    const spell = cards.find((c) => c.name === "草药")!;
    state.players[0].hand = [{ ...spell }];
    const heroBefore = state.players[0].hero.health;

    playCard(state, 0);

    // Trap should still be active (not triggered)
    expect(state.players[0].activeTraps).toHaveLength(1);
    // Hero healed by 5, no trap damage
    expect(state.players[0].hero.health).toBe(Math.min(heroBefore + 5, 30));
  });

  it("checkAndTriggerTraps uses correct event type for on_attack", () => {
    const state = makeTestState();
    let capturedEventType: string | undefined;
    const trapCard = getTrapCard("埋伏");

    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: "on_attack",
      effect: (_s, ctx) => {
        capturedEventType = ctx.event.type;
        return _s;
      },
    }];

    const attacker = makeMinion("A", 1, 5);
    state.players[0].board = [attacker];
    const defender = makeMinion("D", 1, 5);
    state.players[1].board = [defender];

    attackMinion(state, 0, 0);

    expect(capturedEventType).toBe("attack");
  });

  it("checkAndTriggerTraps passes triggeringMinion in context", () => {
    const state = makeTestState();
    let capturedMinion: BoardMinion | undefined;

    state.players[1].activeTraps = [{
      card: getTrapCard("埋伏"),
      trigger: "on_attack",
      effect: (_s, ctx) => {
        capturedMinion = ctx.triggeringMinion;
        return _s;
      },
    }];

    const attacker = makeMinion("TheAttacker", 1, 5);
    state.players[0].board = [attacker];
    const defender = makeMinion("D", 1, 5);
    state.players[1].board = [defender];

    attackMinion(state, 0, 0);

    expect(capturedMinion).toBeDefined();
    expect(capturedMinion!.name).toBe("TheAttacker");
  });
});

describe("背刺陷阱 (Backstab Trap)", () => {
  it("triggers on opponent attack, deals 2 to attacker and 2 to enemy hero", () => {
    const state = makeTestState();
    const trapCard = getTrapCard("背刺陷阱");
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    const attacker = makeMinion("Attacker", 2, 5);
    state.players[0].board = [attacker];
    const defender = makeMinion("Defender", 1, 5);
    state.players[1].board = [defender];

    const heroHealthBefore = state.players[0].hero.health;
    attackMinion(state, 0, 0);

    // Attacker takes 2 from trap + 1 from defender = 3
    expect(attacker.currentHealth).toBe(5 - 1 - 2);
    // Enemy hero takes 2 damage from trap
    expect(state.players[0].hero.health).toBe(heroHealthBefore - 2);
  });

  it("is removed after triggering", () => {
    const state = makeTestState();
    const trapCard = getTrapCard("背刺陷阱");
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    const attacker = makeMinion("Attacker", 2, 5);
    state.players[0].board = [attacker];
    const defender = makeMinion("Defender", 1, 5);
    state.players[1].board = [defender];

    attackMinion(state, 0, 0);

    expect(state.players[1].activeTraps).toHaveLength(0);
  });

  it("has correct card properties", () => {
    const card = getTrapCard("背刺陷阱");
    expect(card.type).toBe("trap");
    expect(card.faction).toBe("qun");
    expect(card.rarity).toBe("rare");
    expect(card.cost).toBe(2);
    expect(card.trapTrigger).toBe("on_attack");
    expect(card.trapEffect).toBeDefined();
  });
});

describe("混乱之阵 (Chaos Formation Trap)", () => {
  it("triggers on opponent spell and deals 2 damage to all enemy minions", () => {
    const state = makeTestState();
    const trapCard = getTrapCard("混乱之阵");
    // Player 1 sets the trap
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    // Player 0 has minions on board
    const m1 = makeMinion("M1", 2, 5);
    const m2 = makeMinion("M2", 3, 3);
    state.players[0].board = [m1, m2];

    // Player 0 casts a spell
    const spell = cards.find((c) => c.name === "草药")!;
    state.players[0].hand = [{ ...spell }];
    playCard(state, 0);

    // Both enemy minions should take 2 damage
    expect(m1.currentHealth).toBe(5 - 2);
    expect(m2.currentHealth).toBe(3 - 2);
  });

  it("is removed after triggering", () => {
    const state = makeTestState();
    const trapCard = getTrapCard("混乱之阵");
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    state.players[0].board = [makeMinion("M1", 2, 5)];
    const spell = cards.find((c) => c.name === "草药")!;
    state.players[0].hand = [{ ...spell }];
    playCard(state, 0);

    expect(state.players[1].activeTraps).toHaveLength(0);
  });

  it("has correct card properties", () => {
    const card = getTrapCard("混乱之阵");
    expect(card.type).toBe("trap");
    expect(card.faction).toBe("qun");
    expect(card.rarity).toBe("rare");
    expect(card.cost).toBe(3);
    expect(card.trapTrigger).toBe("on_spell");
    expect(card.trapEffect).toBeDefined();
  });

  it("does not damage trap owner's minions", () => {
    const state = makeTestState();
    const trapCard = getTrapCard("混乱之阵");
    state.players[1].activeTraps = [{
      card: trapCard,
      trigger: trapCard.trapTrigger!,
      effect: trapCard.trapEffect!,
    }];

    // Player 1 (trap owner) has minions too
    const ownerMinion = makeMinion("OwnerM", 2, 5);
    state.players[1].board = [ownerMinion];

    const enemyMinion = makeMinion("EnemyM", 2, 5);
    state.players[0].board = [enemyMinion];

    const spell = cards.find((c) => c.name === "草药")!;
    state.players[0].hand = [{ ...spell }];
    playCard(state, 0);

    // Enemy minions take 2 damage, owner's minions are unaffected
    expect(enemyMinion.currentHealth).toBe(5 - 2);
    expect(ownerMinion.currentHealth).toBe(5);
  });
});

describe("Full trap lifecycle", () => {
  it("play trap from hand, opponent triggers it, trap is removed", () => {
    const state = makeTestState();

    // Player 0 plays a trap
    const trap = getTrapCard("反间计");
    state.players[0].hand = [trap];
    const playResult = playCard(state, 0);
    expect(playResult.success).toBe(true);
    expect(state.players[0].activeTraps).toHaveLength(1);

    // Switch to player 1
    state.activePlayer = 1;
    const spell = cards.find((c) => c.name === "草药")!;
    state.players[1].hand = [{ ...spell }];

    state.players[1].hero.health = 25;
    const p1HealthBefore = state.players[1].hero.health;
    playCard(state, 0);

    // Player 0's trap fires on player 1's spell, dealing 4 to player 1's hero
    // heal +5 (25->30), then trap -4 = 26
    expect(state.players[1].hero.health).toBe(26);
    expect(state.players[0].activeTraps).toHaveLength(0);
  });
});
